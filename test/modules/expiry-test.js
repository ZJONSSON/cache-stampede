var Promise = require('bluebird'),
    assert = require('assert');

module.exports = function() {
  var count = 0;

  function testFn() {
    count += 1;
    return 'Results';
  }

  before(function() {
    return this.cache.adapter.remove('expiry-test');
  });

  describe('Expiry test',function() {
    describe('Getting a non-cached function',function() {
      it('should return an error',function() {
        return this.cache.get('expiry-test')
          .then(function() {
            throw 'Should not have received value';
          },function(e) {
            assert.equal(e.message,'KEY_NOT_FOUND');
          });
      });
    });

    describe('Executing cache on a function',function() {
      it('on empty cache should return function output',function() {
        return this.cache.cached('expiry-test',testFn,{expiry:200})
          .then(function(d) {
            if (d !== 'Results') throw 'Wrong Value received';
          });
      });

      it('on caching - should return cached result',function() {
        return this.cache.cached('expiry-test',testFn,{expiry:200})
          .then(function(d) {
            if (d !== 'Results') throw 'Wrong Value received';
            if (count != 1) throw 'Function called instead of cached results';
          });
      });

      it('after expiry',function() {
        var self = this;
        return Promise.delay(200)
          .then(function() {
            return self.cache.cached('expiry-test',testFn,{expiry:200});
          })
          .then(function(d) {
            if (d !== 'Results') throw 'Wrong Value received';
            if (count != 2) throw 'Function not called after expiry of cache key';
          });
      });
    });
  });
};
