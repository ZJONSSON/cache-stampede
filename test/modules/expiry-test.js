var Promise = require('bluebird'),
    assert = require('assert');

function shouldNotRun() { throw 'Should not run';}
function shouldError() { throw 'Should have errored';}
function shouldEqual(value) { return function(d) { assert.equal(d,value);};}
function errorMsg(msg) { return function(e) { assert.equal(e.message,msg);};}

module.exports = function() {
  var result = 'This is the result of the expiry test';
  
  function testFn() {
    return result;
  }

  before(function() {
    return this.cache.adapter.remove('expiry-test');
  });

  describe('With defined expiry',function() {
    describe('on empty cache',function() {
      it('`get` should error',function() {
        return this.cache.get('expiry-test')
          .then(shouldError,errorMsg('KEY_NOT_FOUND'));
      });

      it('`cached` should return function output',function() {
        return this.cache.cached('expiry-test',testFn,{expiry:200})
          .then(shouldEqual(result));
      });
    });

    describe('after first `cached`, ',function() {
      it('second `cached` should return from cache',function() {
        return this.cache.cached('expiry-test',shouldNotRun,{expiry:200})
          .then(shouldEqual(result));
      });
      it('`get` should return from cache',function() {
        return this.cache.get('expiry-test',shouldNotRun,{expiry:200})
          .then(function(d) {
            assert.equal(d.data,result);
          });
      });
    });

    describe('after cache expired',function() {
      it('`cached` should re-run function',function() {
        var self = this;
        return Promise.delay(200)
          .then(function() {
            return self.cache.cached('expiry-test',function() { return 'UPDATED_VALUE';},{expiry:200});
          })
          .then(shouldEqual('UPDATED_VALUE'));
      });

      it('and `get` return updated value',function() {
        return this.cache.get('expiry-test')
          .then(function(d) {
            assert.equal(d.data,'UPDATED_VALUE');
          });
      });
      
    });
  });
};
