var Promise = require('bluebird'),
    crypto = require('crypto');


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
  var self = this;
  retry = retry || 0;
  options = options || {};

  var maxRetries = (options.maxRetries !== undefined) ? options.maxRetries : this.maxRetries,
      retryDelay = (options.retryDelay !== undefined) ? options.retryDelay : this.retryDelay;

  return this.adapter.get(key)
    .then(function(d) {
      function keyNotFound() { throw new Error('KEY_NOT_FOUND');}

      if (d && d.expiryTime && new Date() > +d.expiryTime) {
        d = undefined;
        return self.adapter.remove(key).then(keyNotFound);
      }

      if (!d) keyNotFound();

      if (d.__caching__) {
        if (retry++ > maxRetries)
          throw new Error('MAXIMUM_RETRIES');

        return Promise.delay(retryDelay)
          .then(function() {
            return self.get(key,options,retry);
          });
      }

      return d;
    })
    .then(function(d) {
      if (d.encrypted) {   
        d.data = self.decrypt(d.data);
        d.encrypted = false;
      }
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

  return (options.upsert ? this.adapter.update(key,payload) : this.adapter.insert(key,payload))
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
          if (self.passphrase) {
            payload.encrypted = true;
            payload.data = self.encrypt(d);
          } else {
            payload.data = d;
          }
          payload.__caching__ = false;
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

Stampede.prototype.encrypt = function(data) {
  if (!this.passphrase) throw 'MISSING_PASSPHRASE';
  var cipher = crypto.createCipher(this.algo ,this.passphrase);
  return cipher.update(JSON.stringify(data),'utf-8','base64') + cipher.final('base64');
};

Stampede.prototype.decrypt = function(data) {
  if (!this.passphrase) throw 'MISSING_PASSPHRASE';
  var decipher = crypto.createDecipher(this.algo,this.passphrase);
  try {
    return JSON.parse(decipher.update(data,'base64','utf-8')+ decipher.final('utf-8'));
  } catch(e) {
    if (e.message.indexOf('error:06065064') === 0)
      throw new Error('BAD_PASSPHRASE');
    else
      throw e;  
  }
};

module.exports = Stampede;
