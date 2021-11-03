const Promise = require('bluebird');

module.exports = async function(collection) {
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
        await c.insertOne(d,{w: 1});
      } catch(err) {
        if (err && err.message && err.message.indexOf('E11000') !== -1)
          throw new Error('KEY_EXISTS');
        else
          throw err;
      }
    },

    update : (key,d) => {
      d._id = key;
      return c.replaceOne({_id:key},d,{upsert:true});
    },

    remove : async key => {
      return await new Promise((resolve, reject) =>c.deleteOne({_id:key}, (err,d) => err ? reject(err) : resolve(d)));
    },

    close: () => c.s.db.s.client.close()
  };
};
