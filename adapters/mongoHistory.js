const Promise = require('bluebird');

module.exports = async function(collection, opt) {
  opt = opt || {};

  const c = await collection;
  if (!c.findOneAsync) Promise.promisifyAll(c);
  await c.ensureIndex({
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
        await c.insertAsync(d,{w: 1});
      } catch(err) {
        if (err && err.message && err.message.indexOf('E11000') !== -1)
          throw new Error('KEY_EXISTS');
        else
          throw err;
      }
    },

    update : function(key,d,expiry,fnHasExecuted) {
      d.key = key;
      d.updated = new Date();

      let whenExecutedPromise;
      if (fnHasExecuted && opt.whenFnExecuted) {
        whenExecutedPromise = opt.whenFnExecuted(key, d);
      }

      let updateResult = c.updateAsync({
        key: key,
        updated: Infinity
      },d);

      if (whenExecutedPromise) {
        // make sure to start both promises before waiting on result
        return whenExecutedPromise.then(() => updateResult);
      }

      return updateResult;
    },

    remove : function(key,options) {
      const criteria = {
        key: key
      };

      if (!options || !options.all) criteria.updated = Infinity;

      return c.removeAsync(criteria);
    },    

    close: () => c.s.db.close()
  };
};
