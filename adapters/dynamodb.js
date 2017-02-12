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
        .then(d => {
          d = d.Item;
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
        });
    },

    insert : function(key,d) {
      d = {
        id: key,
        cs_data: d.data,
        cs_caching: d.__caching__,
        cs_updated: d.updated.valueOf(),
        cs_info: d.info,
        cs_encrypted: d.encrypted || false,
        cs_error: d.error || false,
        cs_expiryTime: d.expiryTime
      };

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
      const query = {
        TableName: prefix,
        Key: {
          "id": key,
        },
        UpdateExpression: "set cs_data = :cs_data, cs_caching = :cs_caching, cs_encrypted = :cs_encrypted, cs_error = :cs_error, cs_updated =:cs_updated, cs_expiryTime = :cs_expiryTime",
        ExpressionAttributeValues: {
          ":cs_data": d.data,
          ":cs_caching": d.__caching__,
          ":cs_encrypted": d.encrypted ||false,
          ":cs_error": d.error || false,
          ":cs_updated": (d.updated || new Date()).valueOf(),
          ":cs_expiryTime": (d.expiryTime && d.expiryTime.valueOf()  || 200000000000000)
        }
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
