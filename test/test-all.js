var fs = require('fs'),
    path = require('path'),
    stampede = require('../index'),
    mongodb = require('mongodb'),
    Promise = require('bluebird'),
    mongoose = require('mongoose'),
    AWS = require('aws-sdk');

Promise.promisifyAll(mongodb.MongoClient);

mongoose.connect('mongodb://localhost:27017/stampede_tests');

AWS.config.update({ region: 'us-east-1', endpoint: 'http://localhost:8000' });
var dynamodbTableSchema = {
  TableName : "cache",
  KeySchema: [ { AttributeName: "id", KeyType: "HASH" } ],
  AttributeDefinitions: [ { AttributeName: "id", AttributeType: "S" } ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  }
};

// Require in all tests in the modules directory
var tests = fs.readdirSync(path.join(__dirname,'modules'))
  .filter(filename => filename.indexOf('.swp') === -1)
  .map(function(filename) {
    return require(path.join(__dirname,'modules',filename));
  });

// Define caches for each adaptor
var caches = {
  mongo : stampede.mongo(
    mongodb.MongoClient.connectAsync('mongodb://localhost:27017/stampede_tests', {native_parser:true})
      .then(function(db) {
        return db.collection('stampede_tests');
      })
  ),

  mongoHistory : stampede.mongoHistory(
    mongodb.MongoClient.connectAsync('mongodb://localhost:27017/stampede_tests', {native_parser:true})
      .then(function(db) {
        return db.collection('stampede_tests');
      })
  ),

  mongodb : stampede.mongodb(
     mongodb.MongoClient.connect('mongodb://localhost:27017/stampede_tests', {native_parser:true})
      .then(function(db) {
        return db.collection('stampede_tests');
      })
  ),

  mongoose : stampede.mongoose('stampede_tests',{mongoose:mongoose}),

  redis : stampede.redis(
    require('redis')
      .createClient()
  ),

  dynamodb : stampede.dynamodb(new AWS.DynamoDB.DocumentClient()),

  file : stampede.file(path.join(__dirname,'filecache'))
};

// define before hooks for adapters
var befores = {
  dynamodb: function() {
    var dynamodb = Promise.promisifyAll(new AWS.DynamoDB());
    return dynamodb.deleteTableAsync({TableName:dynamodbTableSchema.TableName})
      .catch(err => {
        if (!err.cause || err.cause.message !== 'Cannot do operations on a non-existent table') {
          console.log(err);
          throw err;
        }
      })
      .then(() => dynamodb.createTableAsync(dynamodbTableSchema))
      .catch(err => {
        if (!err.cause || err.cause.message !== 'Cannot create preexisting table') {
          console.log(err);
          throw err;
        }
      });
  }
};

// Go through all caches and run tests
Object.keys(caches)
  .forEach(function(name) {
    var cache = caches[name];

    describe(name+' adapter',function() {
      before(function() {
        this.cache = cache;
        this.adapterName = name;
        if (befores[name])
          return befores[name]();
      });
      tests.forEach(function(test) {
        test();
      });
    });
  });