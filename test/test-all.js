var fs = require('fs'),
    path = require('path'),
    stampede = require('../index');

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

  redis : stampede.redis(
    require('redis')
      .createClient()
  )
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