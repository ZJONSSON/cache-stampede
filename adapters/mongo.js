var Promise = require('bluebird');

module.exports = function(collection) {
  collection = Promise.resolve(collection).then(function(c) {
    if (!c.findOneAsync) Promise.promisifyAll(c);
    return c;
  });
  
  return {
    
    get : function(key) {
      return collection.then(function(c) {
        return c.findOneAsync({_id:key});
      });
    },

    insert : function(key,d) {
      d._id = key;
      return collection.then(function(c) {
        return c.insertAsync(d)
          .catch(function(err) {
            if (err && err.message && err.message.indexOf('E11000') !== -1)
              throw new Error('KEY_EXISTS');
            else
              throw err;
          });
      });
    },

    update : function(key,d) {
      d._id = key;
      return collection.then(function(c) {
        return c.updateAsync({_id:key},d,{upsert:true});
      });
    },

    remove : function(key) {
      return collection.then(function(c) {
        return c.removeAsync({_id:key});
      });
    }
  };
};
