var Promise = require('bluebird'),
    assert = require('assert');

module.exports = function() {
  var count = 0;

  function testFn() {
    count += 1;
    return Promise.delay(600)
      .then(function() {
        return 'Delay Results';
      });
  }

  before(function() {
    return Promise.all([
      this.cache.adapter.remove('delay-testkey'),
      this.cache.adapter.remove('delay-testkey2'),
      this.cache.adapter.remove('delay-testkey3')
    ]);
  });

  describe('Delayed function',function() {
    it('setting should error when db is __caching__',function() {
      var self = this;
      this.cache.cached('delay-testkey',testFn,{info:'TEST'});

      return Promise.delay(10)
        .then(function() {
          return self.cache.set('delay-testkey',function() { return 'New Value'; })
            .then(function() {
              throw 'Should have recevied an error';
            },
            function(err) {
              assert.equal(err.message,'KEY_EXISTS');
            });
        });
    });

    it('return the request info while running',function() {
      return this.cache.info('delay-testkey')
        .then(function(d) {
          assert.equal(d,'TEST');
        });
    });

    it('re-running should wait for cached results',function() {
      return this.cache.cached('delay-testkey',testFn,{maxRetries:6})
        .then(function(d) {
          if (d !== 'Delay Results') throw 'Wrong Error received from cache';
          if (count !== 1)  throw 'Delayed function run multiple times';
          return 'OK';
        });
    });

    it('return the request info after running',function() {
      return this.cache.info('delay-testkey')
        .then(function(d) {
          assert.equal(d,'TEST');
        });
    });

    it('re-running with zero delay should fail',function() {
      this.cache.cached('delay-testkey2',testFn);
      return this.cache.cached('delay-testkey2',testFn,{retryDelay:0})
        .then(function(d) {
          throw 'Should error MAXIMUM_RETRIES';
        },function(e) {
          if (e.message !== 'MAXIMUM_RETRIES') throw e;
        });
    });

    it('rerunning with only one retry should fail',function() {
      this.cache.cached('delay-testkey3',testFn);
      return this.cache.cached('delay-testkey3',testFn,{maxRetries:1})
        .then(function() {
          throw 'Should error MAXIMUM_RETRIES';
        },function(e) {
          if (e.message !== 'MAXIMUM_RETRIES') throw e;
        });
    });
  });
};