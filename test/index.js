const fs = require('fs');
const path = require('path');
const stampede = require('../index');
const Promise = require('bluebird');
const t = require('tap');

// Require in all tests in the modules directory
const tests = fs.readdirSync(path.join(__dirname,'modules'))
  .filter(filename => filename.indexOf('.swp') === -1)
  .map(filename => require(path.join(__dirname,'modules',filename)));

// Define caches for each adaptor
const caches = {
  file : () => stampede.file(path.join(__dirname,'filecache')),

  mongo : async () => {
    const mongodb = require('mongodb');
    const db = await mongodb.MongoClient.connect('mongodb://localhost:27017/stampede_tests', {native_parser:true});
    return stampede.mongo(db.collection('stampede_tests'));
  },

  mongoHistory : async () => {
    const mongodb = require('mongodb');
    const db = await mongodb.MongoClient.connect('mongodb://localhost:27017/stampede_tests', {native_parser:true});
    return stampede.mongoHistory(db.collection('stampede_tests'));
  },

  mongoose : () => {
    const mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost:27017/stampede_tests');
    return stampede.mongoose('stampede_tests',{mongoose:mongoose});
  },

  redis : () => {
    const redis = require('redis').createClient();
    return stampede.redis(redis);
  }
};


// Testing can be narrowed to to individual adapters by providing commma delimited list in `--test-arg`
// Example: `tap index.js --test-arg=mongo,fs`  
const keys = (process.argv[2] && process.argv[2].split(',')) || Object.keys(caches);

keys.forEach(async name => {
  if (process.argv[3] && name !== process.argv[3])
    return;

  const cache = await caches[name]();
  cache.name = name;

  t.test(`${name} adapter`, t => {
    tests.forEach(test => test(t,cache));
  })
  .then( () => {
    if (typeof cache.adapter.close === 'function')
      setTimeout(() => cache.adapter.close(),500);
  });
  t.end();

});
