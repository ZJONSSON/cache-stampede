const serialize = d => {
  let data = Object.assign({}, d);
  data.caching = data.__caching__;
  delete data.__caching__;
  data = Object.keys(data).reduce((o,d) => {
    if (data[d] === undefined) return o;
    let prop = { name: d, value: data[d] };
    if (d === 'data')
      prop.excludeFromIndexes = true;
    o = o.concat(prop);
    return o;
  }, []);
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
      var query = client.key([prefix,key]);
      return client.get(query)
        .then(d => deSerialize(d && d[0]));
    },

    insert : function(key,d) {
      d.key = key;
      d = serialize(d);
      var query = {
        key: client.key([prefix,key]),
        data: d
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
      d.key = key;
      d = serialize(d);
      var query = {
        key: client.key([prefix,key]),
        data: d
      };
      return client.update(query);
    },

    remove : function(key) {
      var query = client.key([prefix,key]);
      return client.delete(query);
    }

  };
};
