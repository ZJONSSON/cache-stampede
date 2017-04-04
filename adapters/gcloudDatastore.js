const Promise = require('bluebird');

module.exports = function(client,prefix) {  
  prefix = prefix || 'cache';
  return {

    get : function(key,options) {
      var query = client.key([prefix,key]);
      return client.get(query)
        .then(d => {
          let data = d && d[0] && d[0].d && JSON.parse(d[0].d);
          if (data && (data.base64 || (data.compressed && typeof data.data === 'string')))
            data.data = new Buffer(data.data,'base64');
          return data;
        });
    },

    insert : function(key,d) {
      if (d && d.data instanceof Buffer) {
        d.data = d.data.toString('base64');
        d.base64 = true;
      }
      var query = {
        key: client.key([prefix,key]),
        data: { d: JSON.stringify(d) }
      };
      const transaction = client.transaction();
      return transaction.run()
        .then(() => transaction.get(query.key))
        .then(results => {
          if (results[0])
            throw new Error('KEY_EXISTS');
          transaction.save(query);
          return transaction.commit();
        })
        .catch(err => {
          return transaction.rollback()
            .then(() => { throw err });
        });
    },

    update : function(key,d) {
      if (d && d.data instanceof Buffer) {
        d.data = d.data.toString('base64');
        d.base64 = true;
      }
      var query = {
        key: client.key([prefix,key]),
        data: { d: JSON.stringify(d) }
      };
      return client.update(query);
    },

    remove : function(key) {
      var query = client.key([prefix,key]);
      return client.delete(query);
    }

  };
};
