var Promise = require('bluebird');

module.exports = function(collection) {
  collection = Promise.resolve(collection).then(function(c) {
    if (!c.findOneAsync) Promise.promisifyAll(c);
    return c.ensureIndex({
      key: 1,
      updated: 1
    },{
      unique: true
    })
    .then(function() {
      return c;
    });
  });
  
  return {
    get : function(key) {
      return collection.then(function(c) {
        return c.find({
          key: key
        })
        .sort({updated: -1})
        .limit(1)
        .toArray()
        .then(function(d) {
          return d[0];
        });
      });
    },

    getHistory : function(key) {
      return collection.then(function(c) {
        return c.find({
          key: key,
          __caching__: false
        })
        .sort({updated:1})
        .toArray();
      });
    },

    insert : function(key,d) {
      d.key = key;
      if (d.__caching__)
        d.updated = Infinity;
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
      d.key = key;
      d.updated = new Date();
      return collection.then(function(c) {
        return c.updateAsync({
          key: key,
          updated: Infinity
        },d);
      });
    },

    remove : function(key,options) {
      var criteria = {
        key: key
      };

      if (!options || !options.all) criteria.updated = Infinity;

      return collection.then(function(c) {
        return c.removeAsync(criteria);
      });
    }
  };
};
