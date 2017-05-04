// GCloud Datastore Adapter
//
// Uses redis to control overwrites on insert,
// because datastore can only run one transaction on an entity per second
// https://cloud.google.com/appengine/articles/scaling/contention
//
// Info properties must be serialized top level because datastore does not
// permit indexing properties contained within a property that is excluded from
// indexing. And the entire object is too large to be indexed as a whole.

const expiryToSeconds = ms => Math.ceil(ms / 1000);

const serialize = d => {
  let data = Object.assign({}, d);
  data.caching = data.__caching__;
  delete data.__caching__;
  data = Object.keys(data).reduce((o,d) => {
    if (data[d] === undefined) return o;
    let prop = { name: d, value: data[d] };
    if (d === 'data')
      prop.excludeFromIndexes = true;
    if (d === 'info' && String(data[d].info) === '[object Object]') {
      Object.keys(data[d].info||{}).forEach(key =>
        o.concat({ name: 'ds_info_'+key, value: data[d].info[key] }));
    }
    else
      o = o.concat(prop);
    return o;
  }, []);
  return data;
};

const deSerialize = d => {
  if (!d) return;
  const data = Object.assign({}, d);
  data.__caching__ = data.caching;
  // bring info properties top level for indexing
  const info = Object.keys(d).reduce((o,key) => {
    if (key.includes('ds_info_'))
      o[key.split('ds_info_')[1]] = d[key];
    return o;
  }, {});
  if (info && info.length)
    data.info = info;
  delete data.caching;
  return data;
};

const Promise = require('bluebird');

module.exports = function(datastoreClient,redisClient,prefix) {  
  Promise.promisifyAll(redisClient);
  prefix = prefix || 'cache';
  return {

    // get from datastore, if not cached get from redis
    get : function(key,options) {
      var query = datastoreClient.key([prefix,key]);
      return datastoreClient.get(query)
        .then(d => {
          if (d && d[0])
            return deSerialize(d[0]);
          return redisClient.getAsync(key).then(res => res && JSON.parse(res));
        });
    },

    // insert only redis
    insert : function(key,d) {
      return redisClient.setnxAsync(key,JSON.stringify(d))
        .then(d => {
          if (!d) throw new Error('KEY_EXISTS');
          return d; 
        });
    },

    // update just datastore
    update : function(key,d) {
      var query = {
        key: datastoreClient.key([prefix,key]),
        data: serialize(d)
      };
      return datastoreClient.upsert(query);
    },

    // remove both
    remove : function(key) {
      var query = datastoreClient.key([prefix,key]);
      return Promise.all([
        datastoreClient.delete(query),
        redisClient.delAsync(key)
      ]);
    }

  };
};
