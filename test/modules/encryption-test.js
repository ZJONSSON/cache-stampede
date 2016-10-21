var assert = require('assert');

function shouldNotRun() { throw 'Should not run';}
function shouldError() { throw 'Should have errored';}
function shouldEqual(value) { return function(d) { assert.equal(d,value);};}
function errorMsg(msg) { return function(e) { assert.equal(e.message,msg);};}

module.exports = function() {
  var result = 'This is the result of the encrypted test';

  function testFn() {
    return result;
  }

  before(function() {
    return this.cache.adapter.remove('encryptkey',{all: true});
    return this.cache.adapter.remove('encryptkey2',{all: true});
  });

  describe('Encryption',function() {
    describe('passphrase in object',function() {
      it('first `cached` should return output',function() {
        this.cache.passphrase = 'testing123';
        return this.cache.cached('encryptkey',testFn)
          .then(shouldEqual(result));
      });

      it('`adapter.get` returns encrypted data',function() {
        var self = this;
        return self.cache.adapter.get('encryptkey')
          .then(function(d) {
            assert.equal(d.__caching__,false);
            assert.notEqual(d,result);
            assert.equal(self.cache.decrypt(d.data,'testing123'),result);
          });
      });

      it('`cached` should return decrypted cached result',function() {
        return this.cache.cached('encryptkey',shouldNotRun)
          .then(shouldEqual(result));
      });

      it('`get` should return decrypted cached result',function() {
        return this.cache.get('encryptkey')
          .then(function(d) {
            assert.equal(d.data,result);
          });
      });
    });

    describe('modified object passphrase',function() {
      it('`get` should error',function() {
        this.cache.passphrase = 'differentPassPhrase';
        return this.cache.get('encryptkey')
          .then(shouldError,errorMsg('BAD_PASSPHRASE'));
      });

      it('`get` with correct passphrase works',function() {
        return this.cache.get('encryptkey',{passphrase:'testing123'})
          .then(function(d) {
            assert.equal(d.data,result);
          });
      });
    });

    describe('passphrase in options',function() {
      it('`cached` works first time',function() {
        return this.cache.cached('encryptkey2',testFn,{passphrase:'newpassphrase'})
          .then(shouldEqual(result));
      });

      it('`adapter.get` returns encrypted data',function() {
        var self = this;
        return self.cache.adapter.get('encryptkey2')
          .then(function(d) {
            assert.equal(d.__caching__,false);
            assert.notEqual(d,result);
            assert.equal(self.cache.decrypt(d.data,'newpassphrase'),result);
          });
      });

      it('`get` without new passphrase fails',function() {
        return this.cache.cached('encryptkey2',testFn)
          .then(shouldError,errorMsg('BAD_PASSPHRASE'));
      });

      it('`get` with new passphrase works',function() {
        return this.cache.cached('encryptkey2',testFn,{passphrase:'newpassphrase'})
          .then(shouldEqual(result));
      });
    });
  });
};
