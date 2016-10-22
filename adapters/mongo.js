var Promise = require('bluebird');

module.exports = function(collection) {
  collection = Promise.resolve(collection).then(function(c) {
    if (!c.findOneAsync) Promise.promisifyAll(c);
    return c;
  });
  
  return {
    
    get : function(key,options) {
      options = options || {};
      var criteria = {_id: key};

      if (options.find && Object.keys(options.find).length) {
        criteria = {$or: [
          criteria,
          options.find
        ]};
      }

      return collection.then(function(c) {
        return c.findOneAsync(criteria);
      });
    },

    insert : function(key,d) {
      d._id = key;
      return collection.then(function(c) {
        return c.insertAsync(d,{w: 1})
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
