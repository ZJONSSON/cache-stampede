var mongo = require('mongoskin'),
    assert = require('assert'),
    Promise = require('bluebird'),
    db = mongo.db("mongodb://localhost:27017/stampede_tests", {native_parser:true}),
    collection = db.collection('error-test'),
    stampede = require('../index').mongo(collection);

var count = 0;

function delayError() {
  count += 1;
  return Promise.delay(500)
    .then(function() {
      throw 'Error';
    });
}

describe('Clean collection',function() {
  it('should run without error',function(done) {
    collection.remove({},done);
  });
});

describe('Function with error',function() {
  it('setting should error when db is __caching__',function() {
    stampede.cached('testkey',delayError).catch(function() {});
    return Promise.delay(11)
      .then(function() {
        return stampede.set('testkey',function() { return 'New Value'; })
          .then(function() {
            throw 'Should error';
          },
          function(err) {
            assert.equal(err.message,'KEY_EXISTS');
          });
      });
  });

  it('should return the correct error',function() {
    return stampede.cached('testkey2',delayError)
      .then(function(d) {
        throw 'Should have returned error';
      },function(e) {
        assert.equal(e,'Error');
      });
  });

  it('should have an empty cache after error is resolved',function() {
    return stampede.get('testkey2')
      .then(
        function() {
          throw 'Should error';
        },
        function(e) {
          assert.equal(e.message,'KEY_NOT_FOUND');
        }
      );
  });
});