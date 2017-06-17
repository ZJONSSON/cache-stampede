const Promise = require('bluebird');
const clues = require('clues');
const crypto = require('crypto');
const zlib = require('zlib');
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
  retry = retry || 0;
  options = options || {};

  const maxRetries = (options.maxRetries !== undefined) ? options.maxRetries : this.maxRetries;
  const retryDelay = (options.retryDelay !== undefined) ? options.retryDelay : this.retryDelay;

  // If we already have the value pre-cached we use it
  if (options.preCache && options.preCache[key] !== undefined)
    return Promise.resolve(options.preCache[key]);

  return (this.adapter.get(key,options))
    .then(d => {
      function keyNotFound() { throw new Error('KEY_NOT_FOUND');}
      if (!d) keyNotFound();

      const updated = +(new Date(d.updated));
      const now = new Date();

      const expired = d.expiryTime && (now > +d.expiryTime);
      const aged = (!isNaN(options.maxAge) && (options.maxAge || options.maxAge === 0) && (updated + (+options.maxAge)) < now);
      const retryExpiry = (d.__caching__ && options.retryExpiry && !isNaN(options.retryExpiry) && (updated + (+options.retryExpiry)) < now);

      if (expired || aged || retryExpiry) {
        d = undefined;
        return this.adapter.remove(key).then(keyNotFound);
      }

      if (d.__caching__) {
        if (retry++ > maxRetries)
          throw new Error('MAXIMUM_RETRIES');

        return Promise.delay(retryDelay)
          .then(() => this.get(key,options,retry));
      }

      if (d.compressed) {
        return zlib.inflateAsync(d.data)
          .then(data => {
            d.data = JSON.parse(data);
            return d;
          });
      } else {
        return d;
      }
      
    })
    .then(d => {
      if (d.encrypted) {
        const passphrase = options.passphrase !== undefined ? options.passphrase : this.passphrase;
        d.data = this.decrypt(d.data,passphrase);
        d.encrypted = false;
      }
      d.updated = new Date(d.updated);
      if (d.error) throw d.data;
      else return d;
    });
};

Stampede.prototype.set = function(key,fn,options) {
  let raw_data;
  options = options || {};

  const payload = {
    info : options.info,
    __caching__ : true,
    updated : new Date(),
  };

  const expiry = options.expiry || this.expiry;
  if (expiry)
    payload.expiryTime = new Date().valueOf() + expiry;

  return (options.upsert ? this.adapter.update(key,payload,expiry) : this.adapter.insert(key,payload,expiry))
    .then(() => {
      if (typeof fn === 'function' || (fn && fn.length && typeof fn[fn.length-1] === 'function'))
        return clues(options.context || {},fn,options.global ||  {},'stampede',options.fullref)
          // We capture any errors from functions executed to see if they should be cached
          .catch(e => {
            if (typeof e === 'string') e = {message:e};
            // If the error is to be cached we transform into a JSON object
            if (e && e.cache) {
              let err = {error: true};
              Object.getOwnPropertyNames(e)
                .forEach(key => err[key] = e[key]);
              return err;
            }
            // Otherwise we remove the key and throw directly
            else return this.adapter.remove(key)
              .then(() => { throw e; });
          });
      else
        return Promise.resolve(fn);
    })
    // Optional compression
    .then(d => {
      raw_data = d;
      // Optional encryption
      const passphrase = options.passphrase !== undefined ? options.passphrase : this.passphrase;
      if (passphrase) {
        payload.encrypted = true;
        d = this.encrypt(d,passphrase);
      } 

      // Optional compression
      const compressed = options.compressed !== undefined ? options.compressed : this.compressed;
      if (compressed) {
        payload.compressed = true;
        return zlib.deflateAsync(JSON.stringify(d));
      }
      else return d;
    })
    .then(d => {
      payload.data = d;
      payload.__caching__ = false;
      if (d && d.error) payload.error = true;
      return this.adapter.update(key,payload,expiry);
    })
    .then(() => {
      payload.data = raw_data;
      if (payload.error) throw payload.data;
      else return options.payload ? payload : payload.data;
    });
};

Stampede.prototype.info = function(key,options) {
  return this.adapter.get(key,options)
    .then(d => d.info);
};

Stampede.prototype.cached = function(key,fn,options) {
  options = options || {};
  return this.get(key,options,0)
    .then(d => options.payload ? d : d.data, e => {
      if (e.message === 'KEY_NOT_FOUND') {
        return this.set(key,fn,options)
          .catch(err => {
            // If we experienced a race situation we try to get the results
            if (err && err.message && String(err.message).indexOf('KEY_EXISTS') !== -1)
              return this.cached(key,fn,options);
            else
              throw err;
          });
      } else throw e;
    });
};

Stampede.prototype.encrypt = function(data,passphrase) {
  if (!passphrase) throw 'MISSING_PASSPHRASE';
  const cipher = crypto.createCipher(this.algo ,passphrase);
  return cipher.update(JSON.stringify(data),'utf-8','base64') + cipher.final('base64');
};

Stampede.prototype.decrypt = function(data,passphrase) {
  if (!passphrase) throw 'MISSING_PASSPHRASE';
  const decipher = crypto.createDecipher(this.algo,passphrase);
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
