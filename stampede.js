var Promise = require('bluebird');

function Stampede(options) {
  if (!(this instanceof Stampede))
    return new Stampede(options);

  options = options || {};
  this.retryDelay = (options.retryDelay !== undefined) ? options.retryDelay : 100;
  this.maxRetries = (options.maxRetries !== undefined) ? options.maxRetries : 5;
  this.adapter = options.adapter || this.adapter;
  if (!this.adapter) throw 'Missing adapter';
}

Stampede.prototype.get = function(key,options,retry) {
  var self = this;
  retry = retry || 0;
  options = options || {};

  var maxRetries = (options.maxRetries !== undefined) ? options.maxRetries : this.maxRetries,
      retryDelay = (options.retryDelay !== undefined) ? options.retryDelay : this.retryDelay;

  return this.adapter.get(key)
    .then(function(d) {
      if (!d) throw new Error('KEY_NOT_FOUND');

      if (d.__caching__) {
        if (retry++ > maxRetries)
          throw new Error('MAXIMUM_RETRIES');

        return Promise.delay(retryDelay)
          .then(function() {
            return self.get(key,options,retry);
          });
      }

      return d;
    });
};

Stampede.prototype.set = function(key,fn,info) {
  var self = this;
  return this.adapter.insert(key,{__caching__: true, info: info})
    .then(function(d) {
      return Promise.fulfilled((typeof fn === 'function') ? fn() : fn)
        .then(function(d) {
          return self.adapter.update(key,{data: d, __caching__: false, info: info})
            .then(function() {
              return d;
            });
        })
        .catch(function(err) {
          return self.adapter.remove(key)
            .then(function() {
              throw err;
            });
        });
    });
};

Stampede.prototype.info = function(key) {
  return this.adapter.get(key)
    .then(function(d) {
      return d.info;
    });
}

Stampede.prototype.cached = function(key,fn,options,info) {
  var self = this;
  return this.get(key,options,0)
    .then(function(d) {
      return d.data;
    },
    function(e) {
      if (e.message === 'KEY_NOT_FOUND') {
        return self.set(key,fn,info)
          .catch(function(err) {
            // If we experienced a race situation we try to get the results
            if (err && err.message && err.message.indexOf('KEY_EXISTS') !== -1)
              return self.cached(key,fn,options,info);
            else
              throw err;
          });
      } else throw e;
    });
};

module.exports = Stampede;
