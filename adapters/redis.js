var Promise = require('bluebird');
var expiryToSeconds = function(ms) {
  return Math.ceil(ms / 1000)
};

module.exports = function(client,prefix) {
  Promise.promisifyAll(client);
  return {

    get : function(key,options) {
      if (options && options.find)
        throw new Error('options `find` not supported in file adapter');
      
      return client.getAsync(key)
        .then(function(res) {
          res = JSON.parse(res);
          if (res && res.data && (res.base64 || (res.compressed && typeof res.data === 'string')))
            res.data = new Buffer(res.data,'base64');
          return res;
        });
    },

    insert : function(key,d,expiry) {
      if (d && d.data instanceof Buffer) {
        d.data = d.data.toString('base64');
        d.base64 = true;
      }
      return client.setnxAsync(key,JSON.stringify(d))
        .then(function(d) {
          if (!d) throw new Error('KEY_EXISTS');
          return d;
        })
        .tap(function(d) {
          if (expiry) return client.expireAsync(key,expiryToSeconds(expiry));
        });
    },

    update : function(key,d,expiry) {
      if (d && d.data instanceof Buffer) {
        d.data = d.data.toString('base64');
        d.base64 = true;
      }
      if (expiry) return client.setexAsync(key,expiryToSeconds(expiry),JSON.stringify(d));
      return client.setAsync(key,JSON.stringify(d));
    },

    remove : function(key) {
      return client.delAsync(key);
    },

    close: () => client.end(true)

  };
};
