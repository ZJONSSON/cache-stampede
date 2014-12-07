var assert = require('assert'),
    Promise = require('bluebird');

module.exports = function() {
  var count = 0;

   function testFn() {
    count+=1;
    return Promise.delay(500)
      .then(function() {
        throw {message:'Error',cache:true};
      });
  }

  function shouldError(d) {
    throw 'Should throw an error, not return value: '+JSON.stringify(d);
  }

  before(function() {
    return this.cache.adapter.remove('errorcache-testkey');
  });

  describe('Function returning a cachable error',function() {
    it('should return the correct error',function() {
      return this.cache.cached('errorcache-testkey',testFn)
        .then(shouldError,function(e) {
            assert.equal(e.message,'Error');
            if (count !== 1) throw 'Wrong Count';
          }
        );
    });

    it('should return the same error on retry',function() {
      return this.cache.cached('errorcache-testkey',testFn)
        .then(shouldError,function(e) {
            assert.equal(e.message,'Error');
            if (count !== 1) throw 'Wrong Count';
          }
        );
    });

    it('should return the error on get',function() {
      return this.cache.get('errorcache-testkey')
        .then(shouldError,function(e) {
          assert.equal(e.message,'Error');
        });
    });
  });
};