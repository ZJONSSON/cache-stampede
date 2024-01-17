const Promise = require('bluebird');

module.exports = async function(collection) {
  const c = await collection;
  await c.createIndex({
    key: 1,
    updated: 1
  },{
    unique: true
  });

  return {
    get : async (key,options) => {
      options = options || {};
      let criteria = {key: key};
      if (options.find && Object.keys(options.find).length)
        criteria = {$or: [
          criteria,
          options.find
        ]};

      
      let d = await c.find(criteria)
        .sort({updated: -1})
        .limit(1)
        .toArray();

      d = d[0];
      if (d && d.data && d.data.buffer)
        d.data = d.data.buffer;
      return d;
    },

    getHistory : async key => {
      return c.find({
        key: key,
        __caching__: false
      })
      .sort({updated:1})
      .toArray();
    },

    insert : async (key,d) => {
      d.key = key;
      if (d.__caching__)
        d.updated = Infinity;
      try {
        await c.insertOne(d,{w: 1});
      } catch(err) {
        if (err && err.message && err.message.indexOf('E11000') !== -1)
          throw new Error('KEY_EXISTS');
        else
          throw err;
      }
    },

    update : function(key,d) {
      d.key = key;
      d.updated = new Date();
      return c.replaceOne({
        key: key,
        updated: Infinity
      }, d);
    },

    remove : function(key, previousData, options) {
      const criteria = {
        key: key
      };

      if (!options || !options.all) criteria.updated = Infinity;

      return c.deleteMany(criteria);
    },    

    close: () => c.client.close()
  };
};
