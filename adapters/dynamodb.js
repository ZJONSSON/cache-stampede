const delimiter = '___';

// TODO onelevel
const serialize = d => {
  const toplevel = (o,d,ref) => {
    o = o || {};
    ref = ref || '';
    Object.keys(d||{}).forEach(key => {
      if (String(d[key]) === "[object Object]")
        toplevel(o,d[key],(ref&&ref+delimiter||'')+key);
      else
        o[(ref&&ref+delimiter||'')+key] = d[key];
    });
    return o;
  }
  let data = {
    id: d.key,
    cs_data: d.data,
    cs_caching: d.__caching__,
    cs_updated: d.updated.valueOf(),
    cs_encrypted: d.encrypted || false,
    cs_error: d.error || false,
    cs_expiryTime: d.expiryTime
  };
  if (d.info)
    data = toplevel(data, d.info, 'cs_info');
  return data;
};

const deSerialize = d => {
  if (!d) return;
  const deToplevel = (d,ref) => {
    ref = ref || '';
    return Object.keys(d||{}).reduce( (p,key) => {
      let obj = p;
      if (ref && key.indexOf(ref) === -1)
        return p;
      const keys = key.split(delimiter);
      keys.slice(0,keys.length-1).forEach(key => obj = obj[key] = obj[key] || {});
      obj[keys[keys.length-1]] = d[key];
      return p;
    }, {});
  };
  let data = deToplevel(d,'cs_info');
  data._id = d.key;
  data.data = d.cs_data;
  data.__caching__ = d.cs_caching;
  data.updated = new Date(d.cs_updated);
  data.encrypted = d.cs_encrypted;
  data.error = d.cs_error;
  data.expiryTime = d.cs_expiryTime;
  return data;
};

const formatUpdate = d => {
  d = serialize(d);
  delete d.id;
  d.cs_updated = (d.cs_updated || new Date()).valueOf();
  d.cs_expiryTime = d.cs_expiryTime && d.cs_expiryTime.valueOf() || 200000000000000;
  let str = Object.keys(d).reduce((o,k) => {o+=k+' = :'+k+', ';return o;},'set ');
  str = str.substring(0, str.length-2); // remove last comma
  const values = Object.keys(d).reduce((o,k) => {o[':'+k]=d[k];return o;},{});
  return {
    UpdateExpression: str,
    ExpressionAttributeValues: values
  };
};

const Promise = require('bluebird');

module.exports = function(client,prefix) {  
  Promise.promisifyAll(client);  
  prefix = prefix || 'cache';

  return {    
    get : function(key,options) {
      const query = {
        TableName: prefix,
        Key: {
          "id":  key
        }
      };
      return client.getAsync(query)
        .then(d => deSerialize(d.Item));
    },

    insert : function(key,d) {
      d.key = key;
      d = serialize(d); 
      const query = {
        TableName: prefix,
        Item: d,
        ConditionExpression: "attribute_not_exists(id)"
      };
      return client.putAsync(query)
        .catch(err => {
          if (err && err.code === 'ConditionalCheckFailedException')
            throw new Error('KEY_EXISTS');
          else
            throw err;
        });
    },

    update : function(key,d) {
      d = formatUpdate(d);
      const query = {
        TableName: prefix,
        Key: {
          "id": key,
        },
        UpdateExpression: d.UpdateExpression,
        ExpressionAttributeValues: d.ExpressionAttributeValues
      };
      return client.updateAsync(query);
    },

    remove : function(key) {
      const query = {
        TableName: prefix,
        Key: {
          "id": key,
        },
      };
      return client.deleteAsync(query);
    }
  };
};
