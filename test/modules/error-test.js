var assert = require('assert'),
    Promise = require('bluebird');

module.exports = function() {

  function testFn() {
    return Promise.delay(500)
      .then(function() {
        throw 'Error';
      });
  }

  before(function() {
    return Promise.all([
      this.cache.adapter.remove('error-testkey'),
      this.cache.adapter.remove('error-testkey2')
    ]);
  });

  describe('Function with error',function() {
    it('setting should error when db is __caching__',function() {
      var cache = this.cache;
      cache.cached('error-testkey',testFn).catch(function() {});
      return Promise.delay(11)
        .then(function() {
          return cache.set('error-testkey',function() { return 'New Value'; })
            .then(function() {
              throw 'Should error';
            },
            function(err) {
              assert.equal(err.message,'KEY_EXISTS');
            });
        });
    });

    it('should return the correct error',function() {
      return this.cache.cached('error-testkey2',testFn)
        .then(function(d) {
          throw 'Should have returned error';
        },function(e) {
          assert.equal(e,'Error');
        });
    });

    it('should have an empty cache after error is resolved',function() {
      return this.cache.get('error-testkey2')
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
};