const delimiter = '___';

const serialize = d => {
  let data = {
    id: d.key,
    cs_data: d.data,
    cs_caching: String(d.__caching__),
    cs_updated: d.updated.toISOString(),
    cs_encrypted: d.encrypted || false,
    cs_error: d.error || false,
    cs_expiryTime: d.expiryTime
  };
  if (String(d.info) === '[object Object]')
    Object.keys(d.info||{}).forEach(key => data['cs_info'+delimiter+key] = d.info[key]);
  else if (d.info)
    data.cs_info = d.info;
  return data;
};

const deSerialize = d => {
  if (!d) return;
  let data = {
    _id: d.key,
    data: d.cs_data,
    __caching__: d.cs_caching === 'true',
    updated: new Date(d.cs_updated),
    encrypted: d.cs_encrypted,
    error: d.cs_error,
    expiryTime: d.cs_expiryTime
  };
  const info = Object.keys(d).reduce((o,key) => {
    if (key.includes('cs_info')) {
      if (key.includes(delimiter))
        o[key.split(delimiter)[1]] = d[key];
      else
        o = d[key];
    }
    return o;
  }, {});
  if (info && info.length)
    data.info = info;
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
