const serialize = d => {
  let data = {
    id: d.key,
    cs_caching: Number(d.__caching__),
    cs_updated: d.updated.toISOString(),
    cs_encrypted: d.encrypted || false,
    cs_compressed: d.compressed || false,
    cs_error: d.error || false,
    cs_expiryTime: d.expiryTime
  };
  if (d.data !== undefined)
    data.cs_data = d.data;
  if (String(d.info) === '[object Object]')
    Object.keys(d.info||{}).forEach(key => data['cs_info_'+key] = d.info[key]);
  else if (d.info)
    data.cs_info = d.info;
  return data;
};

const deSerialize = d => {
  if (!d) return;
  let data = {
    _id: d.key,
    data: d.cs_data,
    __caching__: Boolean(d.cs_caching),
    updated: new Date(d.cs_updated),
    encrypted: d.cs_encrypted,
    compressed: d.cs_compressed,
    error: d.cs_error,
    expiryTime: d.cs_expiryTime
  };
  const info = Object.keys(d).reduce((o,key) => {
    if (key.includes('cs_info_'))
      o[key.split('cs_info_')[1]] = d[key];
    else if (key.includes('cs_info'))
      o = d[key];
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

module.exports = function(client,options) {
  options = options || {};
  Promise.promisifyAll(client);  
  let prefix = options.prefix || 'cache';

  return {    
    get : async key => {
      const query = {
        TableName: prefix,
        Key: {
          id:  key
        }
      };
      const d = await client.get(query).promise();
      return deSerialize(d.Item);
    },

    insert : async (key,d) => {
      d.key = key;
      d = serialize(d); 
      const query = {
        TableName: prefix,
        Item: d,
        ConditionExpression: 'attribute_not_exists(id)'
      };

      try {
        return await client.put(query).promise();
      } catch(err) {
        if (err && err.code === 'ConditionalCheckFailedException')
          throw new Error('KEY_EXISTS');
        else
          throw err;
      }
    },

    update : (key,d) => {
      d = formatUpdate(d);
      const query = {
        TableName: prefix,
        Key: {
          id: key,
        },
        UpdateExpression: d.UpdateExpression,
        ExpressionAttributeValues: d.ExpressionAttributeValues
      };
      return client.update(query).promise();
    },

    remove : function(key) {
      const query = {
        TableName: prefix,
        Key: {
          id: key,
        },
      };
      return client.delete(query).promise();
    }
  };
};
