var mongo = require('mongoskin'),
    assert = require('assert'),
    Promise = require('bluebird'),
    db = mongo.db("mongodb://localhost:27017/stampede_tests", {native_parser:true}),
    collection = db.collection('delay-test'),
    stampede = require('../index').mongo(collection);

var count = 0;

function delayFn() {
  count += 1;
  return Promise.delay(600)
    .then(function() {
      return 'Delay Results';
    });
}

describe('Clean collection',function() {
  it('should run without error',function(done) {
    collection.remove({},done);
  });
});

describe('Delayed function',function() {
  it('setting should error when db is __caching__',function() {
    stampede.cached('testkey',delayFn);
    return Promise.delay(10)
      .then(function() {
        return stampede.set('testkey',function() { return 'New Value'; })
          .then(function() {
            throw 'Should have recevied an error';
          },
          function(err) {
            assert.equal(err.message,'KEY_EXISTS');
          });
      });
  });

  it('re-running should wait for cached results',function() {
    return stampede.cached('testkey',delayFn,{maxRetries:6})
      .then(function(d) {
        if (d !== 'Delay Results') throw 'Wrong Error received from cache';
        if (count !== 1)  throw 'Delayed function run multiple times';
        return 'OK';
      });
  });

  it('re-running with zero delay should fail',function() {
    stampede.cached('testkey2',delayFn);
    return stampede.cached('testkey2',delayFn,{retryDelay:0})
      .then(function(d) {
        throw 'Should error MAXIMUM_RETRIES';
      },function(e) {
        if (e.message !== 'MAXIMUM_RETRIES') throw e;
      });
  });

  it('rerunning with only one retry should fail',function() {
    stampede.cached('testkey3',delayFn);
    return stampede.cached('testkey3',delayFn,{maxRetries:1})
      .then(function() {
        throw 'Should error MAXIMUM_RETRIES';
      },function(e) {
        if (e.message !== 'MAXIMUM_RETRIES') throw e;
      });
  });

});