var Promise = require('bluebird');

function Stampede(options) {
  if (!(this instanceof Stampede))
    return new Stampede(options);

  options = options || {};
  this.retryDelay = (options.retryDelay !== undefined) ? options.retryDelay : 100;
  this.maxRetries = (options.maxRetries !== undefined) ? options.maxRetries : 5;
  this.expiry = options.expiry;
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
      if (d && d.expiryTime && new Date() > +d.expiryTime) {
        d = undefined;
        self.adapter.remove(key);
      }

      if (!d) throw new Error('KEY_NOT_FOUND');

      if (d.__caching__) {
        if (retry++ > maxRetries)
          throw new Error('MAXIMUM_RETRIES');

        return Promise.delay(retryDelay)
          .then(function() {
            return self.get(key,options,retry);
          });
      }

      if (d.error) throw d.data;
      return d;
    });
};

Stampede.prototype.set = function(key,fn,options) {
  options = options || {};

  var payload = {
        info : options.info,
        __caching__ : true,
        updated : new Date(),
      },
      self = this;

  var expiry = options.expiry || this.expiry;
  if (expiry) payload.expiryTime = new Date().valueOf() + expiry;

  return this.adapter.insert(key,payload)
    .then(function(d) {
      return Promise.fulfilled((typeof fn === 'function') ? Promise.try(fn) : fn)
        .catch(function(e) {
          // If the error is to be cached we transform into a JSON object
          if (e && e.cache) {
            var err = {error: true};
            Object.getOwnPropertyNames(e)
              .forEach(function(key) {
                err[key] = e[key];
              });
            return err;
          }
          // Otherwise we remove the key and throw directly
          else return self.adapter.remove(key)
            .then(function() {
              throw e;
            });
        })
        .then(function(d) {
          payload.__caching__ = false;
          payload.data = d;
          if (d && d.error) payload.error = true;
          return self.adapter.update(key,payload)
            .then(function() {
              if (payload.error) throw d;
              else return d;
            });
        });
    });
};

Stampede.prototype.info = function(key) {
  return this.adapter.get(key)
    .then(function(d) {
      return d.info;
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
        return self.set(key,fn,options)
          .catch(function(err) {
            // If we experienced a race situation we try to get the results
            if (err && err.message && err.message.indexOf('KEY_EXISTS') !== -1)
              return self.cached(key,fn,options);
            else
              throw err;
          });
      } else throw e;
    });
};

module.exports = Stampede;
