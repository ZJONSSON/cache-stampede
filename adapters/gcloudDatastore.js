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

const retry = fn => {
  const maxTries = 5;
  let currentAttempt = 1;
  let delay = 100;
  return (function tryRetry() {
    return fn()
      .catch(err => {
        if (err && err.message === 'KEY_EXISTS') throw err;
        if (currentAttempt > maxTries)
          return Promise.reject(err);
        // Use exponential backoff
        return Promise.delay(delay)
          .then(() => {
            currentAttempt++;
            delay *= 2;
            return tryRetry();
          });
      });
  })();
};

const Promise = require('bluebird');

module.exports = function(client,prefix) {  
  prefix = prefix || 'cache';
  return {

    get : function(key,options) {
      var query = client.key([prefix,key]);
      return retry(() => {
        return client.get(query)
          .then(d => deSerialize(d && d[0]));
      });
    },

    insert : function(key,d) {
      d.key = key;
      d = serialize(d);
      var query = {
        key: client.key([prefix,key]),
        data: d
      };
      return retry(() => {
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
              .catch(() => {})
              .then(() => { throw err; });
          });
      });
    },

    update : function(key,d) {
      d.key = key;
      d = serialize(d);
      var query = {
        key: client.key([prefix,key]),
        data: d
      };
      return retry(() => {
        return client.update(query);
      });
    },

    remove : function(key) {
      var query = client.key([prefix,key]);
      return retry(() => {
        return client.delete(query);
      });
    }

  };
};
