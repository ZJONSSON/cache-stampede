const delimiter = 'ᐅ';

const serialize = d => {
  const toplevel = (o,d,ref) => {
    if (!o) o = {};
    if (!ref) ref = '';
    Object.keys(d).forEach(key => {
      if (String(d[key]) === "[object Object]")
        toplevel(o,d[key],(ref&&ref+delimiter||'')+key);
      else
        o[(ref&&ref+delimiter||'')+key] = d[key];
    });
    return o;
  }
  const data = {
    id: d.key,
    cs_data: d.data,
    cs_caching: d.__caching__,
    cs_updated: d.updated.valueOf(),
    cs_info: d.info,
    cs_encrypted: d.encrypted || false,
    cs_error: d.error || false,
    cs_expiryTime: d.expiryTime
  };
  return toplevel(data);
};

const deSerialize = d => {
  const deToplevel = (o,d) => {
    o = o || {};
    Object.keys(d).reduce((o,key) => {
      key.split(delimiter).forEach((k,i,a) => {
        const target = a.slice(0,i).reduce((oo,d) => {oo[d]=oo[d]||{};return oo[d];}, o);
        if (i === a.length-1)
          target = d[key];
      });
    }, {});
    return o;
  };
  d = deToplevel(d);
  if (d) return {
    _id: d.key,
    data: d.cs_data,
    __caching__: d.cs_caching,
    info: d.cs_info,
    updated : new Date(d.cs_updated),
    encrypted: d.cs_encrypted,
    error: d.cs_error,
    expiryTime: d.cs_expiryTime
  };
};

const formatUpdate = d => {
  d = serialize(d);
  const str = Object.keys(d).reduce((o,k) => {o+=k+' = :'+k+',';return o;},'set ');
  str = str.substring(0, str.length-1); // remove last comma
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
