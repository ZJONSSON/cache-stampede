module.exports = function(collection) {  

  return {    
    get : function(key,options) {
      options = options || {};
      let criteria = {_id: key};

      if (options.find) {
        criteria = {$or: [
          criteria,
          options.find
        ]};
      }

      return collection
        .then(c => c.findOne(criteria))
        .then(d => {
          if (d && d.data && d.data.buffer)
            d.data = d.data.buffer;
          return d;
        });
    },

    insert : function(key,d) {
      d._id = key;
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
      d._id = key;
      return collection
        .then(c => c.update({_id:key},d,{upsert:true}));
    },

    remove : function(key) {
      return collection
        .then(c => c.remove({_id:key}));
    }
  };
};
