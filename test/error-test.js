var mongo = require('mongoskin'),
    Promise = require('bluebird'),
    db = mongo.db("mongodb://localhost:27017/stampede_tests", {native_parser:true}),
    collection = db.collection('error-test'),
    stampede = require('../index')(collection);

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
            if (err.message.indexOf('E11000') === -1) throw err;
            return 'ok';
          });
      });
  });

  it('should return the correct error',function() {
    return stampede.cached('testkey',delayError)
      .then(function(d) {
        throw 'Should have returned error';
      },function(e) {
        if (e !== 'Error') throw 'Wrong Error';
        return 'ok';
      });
  });

  it('should have an empty cache after error is resolved',function() {
    return stampede.get('testkey')
      .then(
        function() {
          throw 'Should error';
        },
        function(e) {
        if (e.message !== 'KEY_NOT_FOUND')
          throw 'Expected error KEY_NOT_FOUND';
        }
      );
  });
});