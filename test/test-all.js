const fs = require('fs');
const path = require('path');
const stampede = require('../index');
const Promise = require('bluebird');
const minimist = require('minimist');

// Require in all tests in the modules directory
const tests = fs.readdirSync(path.join(__dirname,'modules'))
  .filter(filename => /\.js$/.test(filename))
  .map(function(filename) {
    const test = require(path.join(__dirname,'modules',filename));
    test.filename = filename;
    return test;
  });

// Define caches for each adaptor
var caches = {

  mongoHistory : async () => {
    const mongodb = require('mongodb');
    Promise.promisifyAll(mongodb.MongoClient);
    const client = await mongodb.MongoClient.connectAsync('mongodb://mongodb:27017/stampede_tests', {native_parser:true});
    return stampede.mongoHistory(client.collection('stampede_history_tests'));
  },

  mongodb : async () => {
    const mongodb = require('mongodb');
    Promise.promisifyAll(mongodb.MongoClient);
    const client = await mongodb.MongoClient.connect('mongodb://mongodb:27017/stampede_tests', {native_parser:true});
    return stampede.mongodb(Promise.resolve(client.collection('stampede_tests_mongodb')));
  },

  mongoose : () => {
    const mongoose = require('mongoose');
    mongoose.connect('mongodb://mongodb:27017/stampede_tests');
    return stampede.mongoose('stampede_tests_mongoose',{mongoose:mongoose});
  },

  redis : () => {
    const redis = require('redis').createClient({host: 'redis'});
    return stampede.redis(redis);
  },

  dynamodb : async () => {
    const AWS = require('aws-sdk');
    const dynamodbSchema = require('./dynamodb_schema');
    AWS.config.update({ region: 'us-east-1','accessKeyId': 'local', 'secretAccessKey': 'local',  endpoint: 'http://dynamodb:8000'});
    var dynamodb = new AWS.DynamoDB();
    try {
      await dynamodb.deleteTable({TableName:dynamodbSchema.TableName}).promise();
    } catch(err) {
      if (err.message !== 'Cannot do operations on a non-existent table') {
        console.log(err);
        throw err;
      }
    }

    try {
      await dynamodb.createTable(dynamodbSchema).promise();
    } catch(err) {
      if (err.message !== 'Cannot create preexisting table') {
        console.log(err.message);
        throw err;
      }
    }

    return stampede.dynamodb(new AWS.DynamoDB.DocumentClient());
  },
/*
  gcloudDatastore : () => {
    const gcloudDatastore = require('@google-cloud/datastore')({
      projectId: process.env.DATASTORE_PROJECT_ID,
      promise: Promise,
      credentials: {
        "type": "service_account",
        "project_id": "local",
        "client_email": "555-compute@developer.gserviceaccount.com",
        "client_id": "555"
      }
    });
    return stampede.gcloudDatastore([gcloudDatastore,redis])
  },
  */

  file : () => stampede.file(path.join(__dirname,'filecache'))
};


module.exports = async t => {
  
  // Allow selecting adapters and tests from command line with rege
  // Example: only use redis driver for error tests:
  // tap test-all.js --test-arg="--adapter=redis" --test-arg="--test=error" -Rspec
  const argv = minimist(process.argv.slice(2));
  const reAdapter = argv.adapter && new RegExp(argv.adapter);
  const reTest = argv.test && new RegExp(argv.test);

  for (let name in caches) {
    if (reAdapter && !reAdapter.test(name)) continue;

    const cache = await caches[name]();

    await t.test(name, async t => {
      for (var i in tests) {
        const test = tests[i];
        if (reTest && !reTest.test(test.filename)) continue;
        await test(t,cache,name);
      }

      let adapter = await cache.adapter;
      if (adapter.close) adapter.close();
      t.end();
    });  

  }

  await t.test('mongodb fnExecute', t => ((require('./mongodb-fn-execute'))(t)));

  t.end();
};

if (!module.parent) module.exports(require('tap')).catch(e => console.error(e))