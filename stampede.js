const Promise = require('bluebird');
const crypto = require('crypto');
const zlib = require('zlib');

Promise.config({ warnings: false});
Promise.promisifyAll(zlib);

const keyNotFound = () => { throw new Error('KEY_NOT_FOUND');};

class Stampede {
  constructor(options) {
    options = this.options = options || {};
    this.whenFnExecuted = options.whenFnExecuted;
    this.retryDelay = (options.retryDelay !== undefined) ? options.retryDelay : 100;
    this.maxRetries = (options.maxRetries !== undefined) ? options.maxRetries : 5;
    this.expiry = options.expiry;
    this.passphrase = options.passphrase;
    this.algo = options.algo || 'aes192';

    if (!options.adapter) throw 'Missing adapter';
    this.adapter = Promise.resolve(options.adapter);

    // Bind the cached function to make it passable directly to consumers of the cache
    this.cached = this.cached.bind(this);
    this.Promise = options.Promise || Promise;
  }

  async setup() {
    this._adapter = await this.adapter;
    this._hasSetup = true;
  }

  async get(key,options,retry) {
    if (!this._hasSetup) await this.setup();
    let value;

    retry = retry || 0;
    options = options || {};

    const maxRetries = (options.maxRetries !== undefined) ? options.maxRetries : this.maxRetries;
    const retryDelay = (options.retryDelay !== undefined) ? options.retryDelay : this.retryDelay;

    // If we already have the value pre-cached we use it
    if (options.preCache && options.preCache[key] !== undefined)
      value = await options.preCache[key];

    let d =  ( value  || await this._adapter.get(key,options));
    if (!d) keyNotFound();

    const updated = +(new Date(d.updated));
    const now = new Date();

    const expired = d.expiryTime && (now > +d.expiryTime);
    const aged = (!isNaN(options.maxAge) && (options.maxAge || options.maxAge === 0) && (updated + (+options.maxAge)) < now);
    const retryExpiry = (d.__caching__ && options.retryExpiry && !isNaN(options.retryExpiry) && (updated + (+options.retryExpiry)) < now);

    if (expired || aged || retryExpiry) {
      if (!options.readOnly) {
        await this._adapter.remove(key, d);
      }

      d = undefined;      
      keyNotFound();
    }

    if (d.__caching__) {
      if (retry++ > maxRetries)
        throw new Error('MAXIMUM_RETRIES');

      await Promise.delay(retryDelay);
      return this.get(key,options,retry);
    }

    if (d.compressed) {
      const inflated = await zlib.inflateAsync(d.data);
      d.data = JSON.parse(inflated);
    }
  
    if (d.encrypted) {
      const passphrase = options.passphrase !== undefined ? options.passphrase : this.passphrase;
      d.data = this.decrypt(d.data,passphrase);
      d.encrypted = false;
    }
    d.updated = new Date(d.updated);
    if (d.error) throw d.data;
    else return d;
  }

  async set(key,fn,options) {
    if (key === undefined) {
      throw new Error('Key cannot be undefined');
    }

    if (!this._hasSetup) await this.setup();
    options = options || {};

    const payload = {
      info : options.info,
      __caching__ : true,
      updated : new Date(),
    };

    const expiry = options.expiry || this.expiry;
    if (expiry) payload.expiryTime = new Date().valueOf() + expiry;

    await (options.upsert ? this._adapter.update(key,payload,expiry) : this._adapter.insert(key,payload,expiry));

    const finalize = async(err, d) => {
      if (err) {
        if (typeof err === 'string') err = {message:err};
        // If the error is to be cached we transform into a JSON object
        if (err && err.cache) {
          d = Object.assign({}, err, {error: true});
        }
        // Otherwise we remove the key and throw directly
        else {
          await this._adapter.remove(key); // no need to pass the payload to what is being removed since it will never be actual data
          throw err;
        }
      }
  
      const raw_data = d;
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
        d = await zlib.deflateAsync(JSON.stringify(d));
      }
      
      payload.data = d;
      payload.__caching__ = false;
      if (d && d.error) payload.error = true;

      let updatePromise = this._adapter.update(key,payload,expiry);

      if (this.whenFnExecuted) {
        await this.whenFnExecuted(key, payload);
      }

      await updatePromise;
       
      payload.data = raw_data;
      if (payload.error) throw payload.data;
      else return options.payload ? payload : payload.data;
    };

    if (options.clues) {
      return [ function $noThrow(_) { return fn; }, function(value) {
        return value.error ? finalize(value) : finalize(null, value);
      }];
    } else {
      try {
        const data = (typeof fn === 'function') ? await Promise.try(fn) : fn;
        return finalize(null, data);
      } catch(e) {
        return finalize(e);
      }
    }
   
  }

  async info(key,options) {
    if (!this._hasSetup) await this.setup();
    const d = await this._adapter.get(key,options);
    return d.info;
  }

  async cached(key,fn,options) {
    if (!this._hasSetup) await this.setup();
    options = options || {};
    try {
      const d = await this.get(key,options,0);
      return options.payload ? d : d.data;
    } catch(e) {
      if (e && e.message === 'KEY_NOT_FOUND') {
        try {
          return await this.set(key,fn,options);
        } catch(err) {
          // If we experienced a race situation we try to get the results
          if (err && err.message && String(err.message).indexOf('KEY_EXISTS') !== -1)
            return this.cached(key,fn,options);
          else
            throw err;
        }
      } else throw e;
    }
  }

  encrypt(data,passphrase) {
    if (!passphrase) throw 'MISSING_PASSPHRASE';
    const cipher = crypto.createCipher(this.algo ,passphrase);
    return cipher.update(JSON.stringify(data),'utf-8','base64') + cipher.final('base64');
  }

  decrypt(data,passphrase) {
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
  }
}

module.exports = Stampede;