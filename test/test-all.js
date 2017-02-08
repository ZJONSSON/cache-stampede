var fs = require('fs'),
    path = require('path'),
    stampede = require('../index'),
    mongodb = require('mongodb'),
    Promise = require('bluebird'),
    mongoose = require('mongoose'),
    AWS = require('aws-sdk'),
    dynamodbSchema = require('./dynamodb_schema');
    gcloudDatastore = require('@google-cloud/datastore')({
      projectId: process.env.DATASTORE_PROJECT_ID,
      promise: Promise,
      credentials: {
        "type": "service_account",
        "project_id": "local",
        "client_email": "555-compute@developer.gserviceaccount.com",
        "client_id": "555"
      }
    });

Promise.promisifyAll(mongodb.MongoClient);

mongoose.connect('mongodb://localhost:27017/stampede_tests');

AWS.config.update({ region: 'us-east-1', endpoint: 'http://localhost:8000' });

// Require in all tests in the modules directory
var tests = fs.readdirSync(path.join(__dirname,'modules'))
  .filter(filename => filename.indexOf('.swp') === -1)
  .map(function(filename) {
    return require(path.join(__dirname,'modules',filename));
  });

// Define caches for each adaptor
var caches = {
  mongo : () => stampede.mongo(
    mongodb.MongoClient.connectAsync('mongodb://localhost:27017/stampede_tests', {native_parser:true})
      .then(function(db) {
        return db.collection('stampede_tests');
      })
  ),

  mongoHistory : () => stampede.mongoHistory(
    mongodb.MongoClient.connectAsync('mongodb://localhost:27017/stampede_tests', {native_parser:true})
      .then(function(db) {
        return db.collection('stampede_tests');
      })
  ),

  mongodb : () => stampede.mongodb(
     mongodb.MongoClient.connect('mongodb://localhost:27017/stampede_tests', {native_parser:true})
      .then(function(db) {
        return db.collection('stampede_tests');
      })
  ),

  mongoose : () =>  stampede.mongoose('stampede_tests',{mongoose:mongoose}),

  redis : () => stampede.redis(
    require('redis')
      .createClient()
  ),

  dynamodb : () => stampede.dynamodb(new AWS.DynamoDB.DocumentClient()),

  gcloudDatastore : () => stampede.gcloudDatastore(gcloudDatastore),

  file : () => stampede.file(path.join(__dirname,'filecache'))
};

// define before hooks for adapters
var befores = {
  dynamodb: function() {
    var dynamodb = Promise.promisifyAll(new AWS.DynamoDB());
    return dynamodb.deleteTableAsync({TableName:dynamodbSchema.TableName})
      .catch(err => {
        if (!err.cause || err.cause.message !== 'Cannot do operations on a non-existent table') {
          console.log(err);
          throw err;
        }
      })
      .then(() => dynamodb.createTableAsync(dynamodbSchema))
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

    if (process.argv[3] && name !== process.argv[3])
      return;

    var cache = caches[name]();

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
