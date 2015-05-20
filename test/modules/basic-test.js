var Promise = require('bluebird'),
    assert = require('assert');

module.exports = function() {
  var count = 0;

  function testFn() {
    count += 1;
    return 'Results';
  }

  before(function() {
    return this.cache.adapter.remove('testkey');
  });

  describe('Basic test',function() {
    describe('Getting a non-cached function',function() {
      it('should return an error',function() {
        return this.cache.get('testkey')
          .then(function() {
            throw 'Should not have received value';
          },function(e) {
            assert.equal(e.message,'KEY_NOT_FOUND');
          });
      });
    });

    describe('Executing cache on a function',function() {
      it('on empty cache should return function output',function() {
        return this.cache.cached('testkey',testFn)
          .then(function(d) {
            if (d !== 'Results') throw 'Wrong Value received';
          });
      });

      it('on caching - should return cached result',function() {
        return this.cache.cached('testkey',testFn)
          .then(function(d) {
            if (d !== 'Results') throw 'Wrong Value received';
            if (count != 1) throw 'Function called instead of cached results';
          });
      });
      it('should return cached result when executed standalone',function() {
        var cached = this.cache.cached;
        return cached('testKey',function() { throw 'SHOULD_NOT_RUN'})
          .then(function(d) {
            if (d !== 'Results') throw 'Wrong Value received';
          });
      });
    });

    describe('Caching a value',function() {
      it('returns the value',function() {
        return this.cache.cached('value','VALUE')
          .then(function(d) {
            if (d !== 'VALUE') throw 'value not returned';
          });
      });

      it('gets it from the cache',function() {
        return this.cache.get('value')
          .then(function(d) {
            if (d.data !== 'VALUE') throw 'value not returned';
          });
      });
    });
  });
};
