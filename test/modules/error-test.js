var assert = require('assert'),
    Promise = require('bluebird');

function shouldNotRun() { throw 'Should not run';}
function shouldError() { throw 'Should have errored';}
function shouldEqual(value) { return function(d) { assert.equal(d,value);};}
function errorMsg(msg) { return function(e) { assert.equal(e.message,msg);};}

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

  describe('Function with non-caching error',function() {
    it('`set` should fail when db is still __caching__',function() {
      var self = this;
      self.cache.cached('error-testkey',testFn).catch(Object);
      return Promise.delay(11)
        .then(function() {
          return self.cache.set('error-testkey',function() { return 'New Value'; })
            .then(shouldError,errorMsg('KEY_EXISTS'));
        });
    });

    it('`cached` should return the correct error',function() {
      return this.cache.cached('error-testkey2',testFn)
        .then(shouldError,errorMsg('Error'));
    });

    it('`get` should show that error was not cached',function() {
      return this.cache.get('error-testkey2')
        .then(shouldError,errorMsg('KEY_NOT_FOUND'));
    });
  });
};