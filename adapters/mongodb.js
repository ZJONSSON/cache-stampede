const Promise = require('bluebird');

module.exports = async function(collection, opt) {
  opt = opt || {};
  const c = await collection;

  return {    
    get : async(key,options) => {
      options = options || {};
      let criteria = {_id: key};

      if (options.find) {
        criteria = {$or: [
          criteria,
          options.find
        ]};
      }

      const d = await c.findOne(criteria);
      if (d && d.data && d.data.buffer)
        d.data = d.data.buffer;
      return d;
    },

    insert : async (key,d) => {
      d._id = key;
      try {
        await c.insert(d,{w: 1});
      } catch(err) {
        if (err && err.message && err.message.indexOf('E11000') !== -1)
          throw new Error('KEY_EXISTS');
        else
          throw err;
      }
    },

    update : (key,d,expiry,fnHasExecuted) => {
      d._id = key;

      let whenExecutedPromise;
      if (fnHasExecuted && opt.whenFnExecuted) {
        whenExecutedPromise = opt.whenFnExecuted(key, d);
      }

      let updateResult = c.update({_id:key},d,{upsert:true});

      if (whenExecutedPromise) {
        // make sure to start both promises before waiting on result
        return whenExecutedPromise.then(() => updateResult);
      }

      return updateResult;
    },

    remove : async key => {
      return await new Promise((resolve, reject) =>c.remove({_id:key}, (err,d) => err ? reject(err) : resolve(d)));
    },

    close: () => c.s.db.close()
  };
};
