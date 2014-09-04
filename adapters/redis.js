var Promise = require('bluebird');

module.exports = function(client,prefix) {
  Promise.promisifyAll(client);
  return {
    
    get : function(key) {
      return client.getAsync(key)
        .then(function(res) {
          return JSON.parse(res);
        });
    },

    insert : function(key,d) {
      return client.setnxAsync(key,JSON.stringify(d))
        .then(function(d) {
          if (!d) throw new Error('KEY_EXISTS');
          return d;
        });
    },

    update : function(key,d) {
      return client.setAsync(key,JSON.stringify(d));
    },

    remove : function(key) {
      return client.delAsync(key);
    }

  };
};
