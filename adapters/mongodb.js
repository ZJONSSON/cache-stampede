module.exports = function(collection) {  

  return {    
    get : function(key,options) {
      options = options || {};
      var criteria = {_id: key};

      if (options.find) {
        criteria = {$or: [
          criteria,
          options.find
        ]};
      }

      return collection.then(function(c) {
        return c.findOne(criteria)
          .then(function(d) {
            if (d && d.data && d.data.buffer)
              d.data = d.data.buffer;
            return d;
          });
      });
    },

    insert : function(key,d) {
      d._id = key;
      return collection.then(function(c) {
        return c.insert(d,{w: 1})
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
        return c.update({_id:key},d,{upsert:true});
      });
    },

    remove : function(key) {
      return collection.then(function(c) {
        return c.remove({_id:key});
      });
    },

    close: () => collection.then(d => d.s.db.close())
  };
};
