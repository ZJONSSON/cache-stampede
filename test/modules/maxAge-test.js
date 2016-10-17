/* jshint mocha:true */

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
    return this.cache.adapter.remove('maxage-test');
  });

  describe('With defined maxAge',function() {
    describe('on empty cache',function() {
      it('`get` should error',function() {
        return this.cache.get('maxage-test',{maxAge:1000})
          .then(shouldError,errorMsg('KEY_NOT_FOUND'));
      });

      it('`cached` should return function output',function() {
        return this.cache.cached('maxage-test',testFn,{maxAge:500})
          .then(shouldEqual(result));
      });
    });

    describe('after first `cached`, ',function() {
      it('second `cached` should return from cache',function() {
        return this.cache.cached('maxage-test',shouldNotRun,{maxAge:500})
          .then(shouldEqual(result));
      });
      it('`get` should return from cache',function() {
        return this.cache.get('maxage-test',shouldNotRun,{maxAge:500})
          .then(function(d) {
            assert.equal(d.data,result);
          });
      });
    });

    describe('after maxAge has passed',function() {
      it('`cached` should re-run function',function() {
        var self = this;
        return Promise.delay(500)
          .then(function() {
            return self.cache.cached('maxage-test',function() { return 'UPDATED_VALUE';},{maxAge:500});
          })
          .then(shouldEqual('UPDATED_VALUE'));
      });

      it('and `get` return updated value',function() {
        return this.cache.get('maxage-test')
          .then(function(d) {
            assert.equal(d.data,'UPDATED_VALUE');
          });
      });
    });
  });
};
