const Promise = require('bluebird');

module.exports = function(collection) {
  collection = Promise.resolve(collection)
    .then(c => c.ensureIndex({
      key: 1,
      updated: 1
    },{
      unique: true
    })
    .then(() => c));
  
  return {
    get : function(key,options) {
      options = options || {};
      let criteria = {key: key};
      if (options.find && Object.keys(options.find).length)
        criteria = {$or: [
          criteria,
          options.find
        ]};

      return collection
        .then(c => c.find(criteria)
          .sort({updated: -1})
          .limit(1)
          .toArray()
        )
        .then(d => {
          d = d[0];
          if (d && d.data && d.data.buffer)
            d.data = d.data.buffer;
          return d;
        });
    },

    getHistory : function(key) {
      return collection
        .then(c => c.find({
          key: key,
          __caching__: false
        })
        .sort({updated:1})
        .toArray());
    },

    insert : function(key,d) {
      d.key = key;
      if (d.__caching__)
        d.updated = Infinity;
      return collection
        .then(c => c.insert(d,{w: 1}))
        .catch(err => {
          if (err && err.message && err.message.indexOf('E11000') !== -1)
            throw new Error('KEY_EXISTS');
          else
            throw err;
        });
    },

    update : function(key,d) {
      d.key = key;
      d.updated = new Date();
      return collection
        .then(c => c.update({
          key: key,
          updated: Infinity
        },d));
    },

    remove : function(key,options) {
      let criteria = {
        key: key
      };

      if (!options || !options.all) criteria.updated = Infinity;

      return collection
        .then(c => c.remove(criteria));
    },

    close : function() {
      return collection.then(c => c.s.db.close());
    }
  };
};
