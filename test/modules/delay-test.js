var Promise = require('bluebird'),
    assert = require('assert');

function shouldError() { throw 'Should have errored';}
function shouldEqual(value) { return function(d) { assert.equal(d,value);};}
function errorMsg(msg) { return function(e) { assert.equal(e.message,msg);};}

module.exports = function() {
  var result = 'This is the result of the delay test';

  function testFn() {
    return Promise.delay(600)
      .then(function() {
        return result;
      });
  }

  before(function() {
    return Promise.all([
      this.cache.adapter.remove('delay-testkey',{all: true}),
      this.cache.adapter.remove('delay-testkey2',{all: true}),
      this.cache.adapter.remove('delay-testkey3',{all: true})
    ]);
  });

  describe('When fn is async',function() {
    it('`set` should error when db is __caching__',function() {
      var self = this;
      this.cache.cached('delay-testkey',testFn,{info:'TEST'});

      return Promise.delay(10)
        .then(function() {
          return self.cache.set('delay-testkey',function() { return 'New Value'; })
            .then(shouldError,errorMsg('KEY_EXISTS'));
        });
    });

    it('cache responds to `info` while fn running',function() {
      return this.cache.info('delay-testkey')
        .then(shouldEqual('TEST'));
    });

    it('re-running should wait for cached results',function() {
      return this.cache.cached('delay-testkey',function() { throw 'Should not run';},{maxRetries:6})
        .then(shouldEqual(result));
    });

    it('return the request info after running',function() {
      return this.cache.info('delay-testkey')
        .then(shouldEqual('TEST'));
    });

    it('re-running with zero delay should fail MAXIMUM_RETRIES',function() {
      this.cache.cached('delay-testkey2',testFn);
      return this.cache.cached('delay-testkey2',testFn,{retryDelay:0})
        .then(shouldError,errorMsg('MAXIMUM_RETRIES'));
    });

    it('rerunning with only one retry should fail',function() {
      this.cache.cached('delay-testkey3',testFn);
      return this.cache.cached('delay-testkey3',testFn,{maxRetries:1})
        .then(shouldError,errorMsg('MAXIMUM_RETRIES'));
    });
  });
};