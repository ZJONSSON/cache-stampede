var mongo = require('mongoskin'),
    Promise = require('bluebird'),
    db = mongo.db("mongodb://localhost:27017/stampede_tests", {native_parser:true}),
    collection = db.collection('basic-test'),
    stampede = require('../index')(collection);

var count = 0,delayCount = 0;

function testFn() {
  count += 1;
  return 'Results';
}

function delayFn() {
  delayCount += 1;
  return Promise.delay(500)
    .then(function() {
      return 'Delay Results';
    });
}

describe('Clean collection',function() {
  it('should run without error',function(done) {
    collection.remove({},done);
  });
});

describe('Getting a non-cached function',function() {
  it('should return an error',function() {
    return stampede.get('testkey')
      .then(function() {
        throw 'Should not have received value';
      },function(e) {
        if (e.message !== 'KEY_NOT_FOUND') throw e;
      });
  });
});

describe('Executing cache on a function',function() {
  it('on empty cache should return function output',function() {
    return stampede.cached('testkey',testFn)
      .then(function(d) {
        if (d !== 'Results') throw 'Wrong Value received';
      });
  });

  it('on caching - should return cached result',function() {
    return stampede.cached('testkey',testFn)
      .then(function(d) {
        if (d !== 'Results') throw 'Wrong Value received';
        if (count != 1) throw 'Function called instead of cached results';
      });
  });
});

describe('Caching a value',function() {
  it('returns the value',function() {
    return stampede.cached('value','VALUE')
      .then(function(d) {
        if (d !== 'VALUE') throw 'value not returned';
      });
  });

  it('gets it from the cache',function() {
    return stampede.get('value')
      .then(function(d) {
        if (d.data !== 'VALUE') throw 'value not returned';
      });
  })
});