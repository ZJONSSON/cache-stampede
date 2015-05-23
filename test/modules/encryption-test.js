var Promise = require('bluebird'),
    assert = require('assert');

module.exports = function() {
  var result = 'This is the result of the encrypted test';

  function testFn() {
    return result;
  }

  before(function() {
    return this.cache.adapter.remove('encryptkey');
  });

  describe('Encryption test',function() {
    describe('Executing cache on a function',function() {
      it('on empty cache should return function output',function() {
        this.cache.passphrase = 'testing123';
        return this.cache.cached('encryptkey',testFn)
          .then(function(d) {
            if (d !== result) throw 'Wrong Value received';
          });
      });

      it('should save the data in encrypted form',function() {
        var cache = this.cache;
        return cache.adapter.get('encryptkey')
          .then(function(d) {
            assert.equal(d.__caching__,false);
            assert.notEqual(d,result);
            assert.equal(cache.decrypt(d.data),result);
          });
      });

      it('on caching - should return decrypted cached result',function() {
        return this.cache.cached('encryptkey',function() { throw 'SHOULD_NOT_RUN';})
          .then(function(d) {
            if (d !== result) throw 'Wrong Value received';
          });
      });

      it('on get - should return decrypted cached result',function() {
        return this.cache.get('encryptkey',function() { throw 'SHOULD_NOT_RUN';})
          .then(function(d) {
            if (d.data !== result) throw 'Wrong Value received';
          });
      });

      it('get with a different passphrase should error',function() {
        this.cache.passphrase = 'differentPassPhrase';
        return this.cache.get('encryptkey',function() { throw 'SHOULD_NOT_RUN';})
          .then(function() { throw 'SHOULD_NOT_RUN';},function(e) {
            assert.equal(e.message,'BAD_PASSPHRASE');
          });
      });
    });
  });
};
