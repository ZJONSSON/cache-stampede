var Promise = require('bluebird');

function Stampede(collection,options) {
  if (!collection) throw 'Missing argument: collection';
   if (!(this instanceof Stampede))
    return new Stampede(collection,options);

  options = options || {};
  options.retryDelay = (options.retryDelay !== undefined) ? options.retryDelay : 100;
  options.maxRetries = (options.maxRetries !== undefined) ? options.maxRetries : 5;

  this.options = options;
  this.collection = collection;
}

Stampede.prototype.get = function(key,options,retry) {
  var self = this;
  retry = retry || 0;
  options = options || {};

  var maxRetries = (options.maxRetries !== undefined) ? options.maxRetries : this.options.maxRetries,
      retryDelay = (options.retryDelay !== undefined) ? options.retryDelay : this.options.retryDelay;

  return new Promise(function(resolve,reject) {
    self.collection.findOne({_id:key},function(err,d) {
      if (err)
        reject(err);
      else if (!d)
        reject(new Error('KEY_NOT_FOUND'));
      else if (d.__caching__ === true) {
        if (retry++ < maxRetries)
          return Promise.delay(retryDelay)
            .then(function() {
              resolve(self.get(key,options,retry));
            });
        else
          return reject(new Error('MAXIMUM_RETRIES'));
      } else
        return resolve(d);
    });
  });
};

Stampede.prototype.set = function(key,fn) {
  var self = this;
  return new Promise(function(resolve,reject) {
    self.collection.insert({_id: key,__caching__: true},function(err,d) {
      if (err) return reject(err);
      return Promise.fulfilled(typeof fn === 'function' ? fn() : fn)
        .then(function(d) {
          self.collection.update({_id:key},{_id:key,data:d,__caching__:false},{upsert:true},function(err,e) {
            resolve(d);
          });
        })
        .catch(function(e) {
          // If the functioned failed, we remove the key from cache
          self.collection.remove({_id:key},function(err) {
            reject(e);
          });
        });
    });
  });
};

Stampede.prototype.cached = function(key,fn,options) {
  var self = this;
  return this.get(key,options,0)
    .then(function(d) {
      return d.data;
    },
    function(e) {
      if (e.message === 'KEY_NOT_FOUND') {
        return self.set(key,fn)
          .catch(function(err) {
            // If we experienced a race situation we try to get the results
            if (err && err.message && err.message.indexOf('E11000') !== -1)
              return self.cached(key,fn,options);
            else
              throw err;
          });
      } else throw e;
    });
};

module.exports = Stampede;