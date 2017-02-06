const Promise = require('bluebird');

module.exports = function(client,prefix) {  
  Promise.promisifyAll(client);  
  prefix = prefix || 'cache';

  return {    
    get : function(key,options) {
      const query = {
        TableName: prefix,
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: {
          ":id": key
        }
      };
      return client.queryAsync(query)
        .then(d => d.Items && d.Items[0] && JSON.parse(d.Items[0].ddata) || undefined);
    },

    insert : function(key,d) {
      const query = {
        TableName: prefix,
        Item: {
          "id": key,
          "ddata": JSON.stringify(d)
        },
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
        UpdateExpression: "set ddata = :d",
        ExpressionAttributeValues: {
          ":d": JSON.stringify(d)
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
