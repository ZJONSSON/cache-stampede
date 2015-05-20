var fs = require('fs'),
    path = require('path'),
    stampede = require('../index'),
    mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/stampede_tests');

// Require in all tests in the modules directory
var tests = fs.readdirSync(path.join(__dirname,'modules'))
  .map(function(filename) {
    return require(path.join(__dirname,'modules',filename));
  });

// Define caches for each adaptor
var caches = {
  mongo : stampede.mongo(
    require('mongoskin')
      .db("mongodb://localhost:27017/stampede_tests", {native_parser:true})
      .collection('stampede_tests')
  ),

  mongoose : stampede.mongoose('stampede_tests',{mongoose:mongoose}),

  redis : stampede.redis(
    require('redis')
      .createClient()
  ),

  file : stampede.file(path.join(__dirname,'filecache'))
};

// Go through all caches and run tests
Object.keys(caches)
  .forEach(function(name) {
    var cache = caches[name];

    describe(name+' adapter',function() {
      before(function() {
        this.cache = cache;
      });
      tests.forEach(function(test) {
        test();
      });
    });
  });