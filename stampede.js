var Promise = require('bluebird'),
    crypto = require('crypto'),
    zlib = require('zlib');

Promise.promisifyAll(zlib);

function Stampede(options) {
  if (!(this instanceof Stampede))
    return new Stampede(options);
  options = this.options = options || {};
  this.retryDelay = (options.retryDelay !== undefined) ? options.retryDelay : 100;
  this.maxRetries = (options.maxRetries !== undefined) ? options.maxRetries : 5;
  this.expiry = options.expiry;
  this.passphrase = options.passphrase;
  this.algo = options.algo || 'aes192';
  this.adapter = options.adapter || this.adapter;
  // Bind the cached function to make it passable directly to consumers of the cache
  this.cached = this.cached.bind(this);
  if (!this.adapter) throw 'Missing adapter';
}

Stampede.prototype.get = function(key,options,retry) {
  var self = this,
      value;

  retry = retry || 0;
  options = options || {};

  var maxRetries = (options.maxRetries !== undefined) ? options.maxRetries : this.maxRetries,
      retryDelay = (options.retryDelay !== undefined) ? options.retryDelay : this.retryDelay;

  // If we already have the value pre-cached we use it
  if (options.preCache && options.preCache[key] !== undefined)
    value = Promise.resolve(options.preCache[key]);

  return ( value  || this.adapter.get(key,options))
    .then(function(d) {
      function keyNotFound() { throw new Error('KEY_NOT_FOUND');}
      if (!d) keyNotFound();

      var updated = +(new Date(d.updated)),
          now = new Date();

      var expired = d.expiryTime && (now > +d.expiryTime),
          aged = (!isNaN(options.maxAge) && (options.maxAge || options.maxAge === 0) && (updated + (+options.maxAge)) < now),
          retryExpiry = (d.__caching__ && options.retryExpiry && !isNaN(options.retryExpiry) && (updated + (+options.retryExpiry)) < now);

      if (expired || aged || retryExpiry) {
        d = undefined;
        return self.adapter.remove(key).then(keyNotFound);
      }

      if (d.__caching__) {
        if (retry++ > maxRetries)
          throw new Error('MAXIMUM_RETRIES');

        return Promise.delay(retryDelay)
          .then(function() {
            return self.get(key,options,retry);
          });
      }

      if (d.compressed) {
        d.data = zlib.inflateAsync(new Buffer(d.data,'base64')).then(JSON.parse);
      }

      return Promise.props(d);
    })
    .then(function(d) {
      if (d.encrypted) {
        var passphrase = options.passphrase !== undefined ? options.passphrase : self.passphrase;
        d.data = self.decrypt(d.data,passphrase);
        d.encrypted = false;
      }
      d.updated = new Date(d.updated);
      if (d.error) throw d.data;
      else return d;
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

  return (options.upsert ? this.adapter.update(key,payload,expiry) : this.adapter.insert(key,payload,expiry))
    .then(function() {

      function finalize(d) {
        return Promise.resolve(d)
         .catch(function(e) {
            if (typeof e === 'string') e = {message:e};
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
            var passphrase = options.passphrase !== undefined ? options.passphrase : self.passphrase;
            if (passphrase) {
              payload.encrypted = true;
              payload.data = self.encrypt(d,passphrase);
            } else {
              payload.data = d;
            }

            var compressed = options.compressed !== undefined ? options.compressed : self.compressed;
            if (compressed) {
              payload.compressed = true;
              payload.data = zlib.deflateAsync(JSON.stringify(payload.data)).then(function(s) {
                return s.toString('base64');
              });
            }

            return Promise.props(payload)
              .then(function(payload) {
                payload.__caching__ = false;
                if (d && d.error) payload.error = true;
                return self.adapter.update(key,payload,expiry)
                  .then(function() {
                    payload.data = d;
                    if (payload.error) throw d;
                    else return options.payload ? payload : d;
                  });
              });
            });
      }

      if (options.clues) {
        return [ function $noThrow(_) { return fn; }, function(value) {
          if (value.error)
            value = Promise.reject(value);
          return finalize(value);
        }];
      } else {
        return finalize(Promise.fulfilled((typeof fn === 'function') ? Promise.try(fn) : fn));
      }
    });
};

Stampede.prototype.info = function(key,options) {
  return this.adapter.get(key,options)
    .then(function(d) {
      return d.info;
    });
};

Stampede.prototype.cached = function(key,fn,options) {
  options = options || {};
  var self = this;
   return this.get(key,options,0)
    .then(function(d) {
      return options.payload ? d : d.data;
    },
    function(e) {
      if (e.message === 'KEY_NOT_FOUND') {
        return self.set(key,fn,options)
          .catch(function(err) {
            // If we experienced a race situation we try to get the results
            if (err && err.message && String(err.message).indexOf('KEY_EXISTS') !== -1)
              return self.cached(key,fn,options);
            else
              throw err;
          });
      } else throw e;
    });
};

Stampede.prototype.encrypt = function(data,passphrase) {
  if (!passphrase) throw 'MISSING_PASSPHRASE';
  var cipher = crypto.createCipher(this.algo ,passphrase);
  return cipher.update(JSON.stringify(data),'utf-8','base64') + cipher.final('base64');
};

Stampede.prototype.decrypt = function(data,passphrase) {
  if (!passphrase) throw 'MISSING_PASSPHRASE';
  var decipher = crypto.createDecipher(this.algo,passphrase);
  try {
    return JSON.parse(decipher.update(data,'base64','utf-8')+ decipher.final('utf-8'));
  } catch(e) {
    if (e instanceof TypeError || (e.message && e.message.indexOf('bad decrypt') !== -1))
      throw new Error('BAD_PASSPHRASE');
    else
      throw e;
  }
};

module.exports = Stampede;
