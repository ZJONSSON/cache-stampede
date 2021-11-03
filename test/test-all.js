const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const stampede = require('../index');
const Promise = require('bluebird');
const minimist = require('minimist');
const fnExecute = require('./mongodb-fn-execute')
const { MongoClient } = require('mongodb');

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

  mongoHistory : async options => {
    const client = await new MongoClient('mongodb://mongodb:27017/stampede_tests').connect();
    return stampede.mongoHistory(client.db().collection('stampede_history_tests'), options);
  },

  mongodb : async options => {
    const client = await new MongoClient('mongodb://mongodb:27017/stampede_tests').connect();
    return stampede.mongodb(Promise.resolve(client.db().collection('stampede_tests_mongodb')), options);
  },

  mongoose : options => {
    const mongoose = require('mongoose');
    mongoose.connect('mongodb://mongodb:27017/stampede_tests');
    return stampede.mongoose('stampede_tests_mongoose',Object.assign({}, options || {}, {mongoose:mongoose}));
  },

  redis : options => {
    const redis = require('redis').createClient({host: 'redis'});
    return stampede.redis(redis, options);
  },

  dynamodb : async options => {
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

    return stampede.dynamodb(new AWS.DynamoDB.DocumentClient(), options);
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

  file : async (options) => {
    let filecacheDir = path.join(__dirname,'filecache');
    const dir = await fsPromises.opendir(filecacheDir);
    for await (const dirent of dir) {
      let n = dirent.name;
      if (n === '.gitignore') continue;
      await fsPromises.unlink(path.join(filecacheDir, n));
      await Promise.delay(1000);
    }
    return stampede.file(filecacheDir, options);
  }
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

      // run fn execute tasks which need to create a new adapter
      // the mongoose adapter doesn't do well if we `.close` it then try to reopen....
      // so do this before we close the original adapter....
      await fnExecute(t, caches[name]);

      let adapter = await cache.adapter;
      if (adapter.close) adapter.close();

      t.end();
    });  
  }

  t.end();
};

if (!module.parent) module.exports(require('tap')).catch(e => console.error(e))