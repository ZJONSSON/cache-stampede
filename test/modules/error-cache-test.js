var assert = require('assert'),
    Promise = require('bluebird');

function shouldNotRun() { throw 'Should not run';}
function shouldError() { throw 'Should have errored';}
function errorMsg(msg) { return function(e) { assert.equal(e.message,msg);};}

module.exports = function() {
  function testFn() {
    return Promise.delay(500)
      .then(function() {
        throw {message:'Error',cache:true};
      });
  }

  before(function() {
    return this.cache.adapter.remove('errorcache-testkey',{all: true});
  });

  describe('Error with `cache` as true',function() {
    it('should return as rejected promise',function() {
      return this.cache.cached('errorcache-testkey',testFn)
        .then(shouldError,errorMsg('Error'));
    });

    it('second `cache` should return same rejection from cache',function() {
      return this.cache.cached('errorcache-testkey',shouldNotRun)
        .then(shouldError,errorMsg('Error'));
    });

    it('`get` should return same rejection',function() {
      return this.cache.get('errorcache-testkey')
        .then(shouldError,errorMsg('Error'));
    });
  });
};