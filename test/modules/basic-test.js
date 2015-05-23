var assert = require('assert');

function shouldError() { throw 'Should have errored';}
function shouldEqual(value) { return function(d) { assert.equal(d,value);};}
function errorMsg(msg) { return function(e) { assert.equal(e.message,msg);};}

module.exports = function() {
  var result = 'This is the result of the basic test';

  function testFn() {
    return result;
  }

  before(function() {
    return this.cache.adapter.remove('testkey');
  });

  describe('Basic test',function() {
    describe('on empty cache',function() {
      it('`get` should error',function() {
        return this.cache.get('testkey')
          .then(shouldError,errorMsg('KEY_NOT_FOUND'));
      });

      it('`cached` should return function output',function() {
        return this.cache.cached('testkey',testFn)
          .then(shouldEqual(result));
      });
    });

    describe('after first `cached`',function() {
      it('second `cached` should load from cache',function() {
        return this.cache.cached('testkey',function() { throw 'Should not run fn';})
          .then(shouldEqual(result));
      });

      it('`get` should load from cache',function() {
        return this.cache.get('testkey')
          .then(function(d) {
            assert.equal(d.data,result);
          });
      });
    });


    describe('Caching a value',function() {
      it('`cached` returns the value',function() {
        return this.cache.cached('value','VALUE')
          .then(shouldEqual('VALUE'));
      });

      it('`get` returns the value',function() {
        return this.cache.get('value')
          .then(function(d) {
            assert.equal(d.data,'VALUE');
          });
      });
    });
  });
};
