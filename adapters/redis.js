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
          return JSON.parse(res);
        });
    },

    insert : function(key,d,expiry) {
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
      if (expiry) return client.setexAsync(key,expiryToSeconds(expiry),JSON.stringify(d));
      return client.setAsync(key,JSON.stringify(d));
    },

    remove : function(key) {
      return client.delAsync(key);
    }

  };
};
