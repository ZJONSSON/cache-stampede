const Promise = require('bluebird');

const expiryToSeconds = ms => Math.ceil(ms / 1000);

module.exports = function(client,prefix) {
  Promise.promisifyAll(client);
  return {

    get : async (key,options) => {
      if (options && options.find)
        throw new Error('options `find` not supported in file adapter');
      
      let res = await client.getAsync(key);
      res = JSON.parse(res);
      if (res && res.data && (res.base64 || (res.compressed && typeof res.data === 'string')))
        res.data = Buffer.from(res.data,'base64');
      return res;
    },

    insert : async (key,d,expiry) => {
      if (d && d.data instanceof Buffer) {
        d.data = d.data.toString('base64');
        d.base64 = true;
      }
      const i = await client.setnxAsync(key,JSON.stringify(d));
      if (expiry) return client.expireAsync(key,expiryToSeconds(expiry));

      if (!i) throw new Error('KEY_EXISTS');
      return i;
    },

    update : (key,d,expiry) => {
      if (d && d.data instanceof Buffer) {
        d.data = d.data.toString('base64');
        d.base64 = true;
      }
      if (expiry) return client.setexAsync(key,expiryToSeconds(expiry),JSON.stringify(d));
      return client.setAsync(key,JSON.stringify(d));
    },

    remove : key => client.delAsync(key),

    close: () => client.end(true)

  };
};
