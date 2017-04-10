const serialize = d => {
  const data = Object.assign({}, d);
  data.caching = data.__caching__;
  delete data.__caching__;
  return data;
};

const deSerialize = d => {
  if (!d) return;
  const data = Object.assign({}, d);
  data.__caching__ = data.caching;
  delete data.caching;
  return data;
};

const Promise = require('bluebird');

module.exports = function(client,prefix) {  
  prefix = prefix || 'cache';
  return {

    get : function(key,options) {
      const query = client.createQuery(prefix)
        .hasAncestor(client.key([prefix,key]))
        .order('updated', { descending: true })
        .limit(1);
      return client.get(query)
        .then(d => deSerialize(d && d[0] && d[0].d));
    },

    getHistory : function(key) {
      const query = client.createQuery(prefix)
        .hasAncestor(client.key([prefix,key]))
        .order('updated', { descending: true });
      return client.runQuery(query)
        .then(d => [].concat(d && d[0]).map(d => deSerialize(d.d)));
    },

    insert : function(key,d) {
      d.key = key;
      d.updated = new Date();
      d = serialize(d);
      var query = {
        key: client.key([prefix,key,'updated',String(d.updated)]),
        data: { d: d }
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
      return this.insert.apply(this, ...arguments);
    },

    remove : function(key) {
      var query = client.key([prefix,key]);
      return client.delete(query);
    }

  };
};
