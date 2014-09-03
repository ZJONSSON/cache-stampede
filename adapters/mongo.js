var Promise = require('bluebird');

module.exports = function(collection) {
  Promise.promisifyAll(collection);
  return {
    
    get : function(key) {
      return collection.findOneAsync({_id:key});
    },

    insert : function(key,d) {
      d._id = key;
      return collection.insertAsync(d)
        .catch(function(err) {
          if (err && err.message && err.message.indexOf('E11000') !== -1)
            throw new Error('KEY_EXISTS');
          else
            throw err;
        });
    },

    update : function(key,d) {
      d._id = key;
      return collection.updateAsync({_id:key},d,{upsert:true});
    },

    remove : function(key) {
      return collection.removeAsync({_id:key});
    }

  };
};
