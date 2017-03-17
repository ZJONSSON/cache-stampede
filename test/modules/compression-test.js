var assert = require('assert'),
    Promise = require('bluebird'),
    zlib = require('zlib');

Promise.promisifyAll(zlib);


function shouldNotRun() { throw 'Should not run';}
function shouldEqual(value) { return function(d) { assert.equal(d,value);};}

module.exports = function() {
  var result = 'This is the result of the encrypted test';

  function testFn() {
    return result;
  }

  before(function() {
    return Promise.all([
      this.cache.adapter.remove('compresskey1',{all: true}),
      this.cache.adapter.remove('compresskey2',{all: true})
    ]);
  });

  describe('Compressed',function() {
    it('first `cached` should return output',function() {
      return this.cache.cached('compresskey1',testFn,{compressed:true})
        .then(shouldEqual(result));
    });

    it('`adapter.get` returns encrypted data',function() {
      var self = this;
      return self.cache.adapter.get('compresskey1')
        .then(function(d) {
          assert.equal(d.__caching__,false);
          assert.notEqual(d.data,result);

          return zlib.inflateAsync(d.data).then(d => JSON.parse(d));
        })
        .then(shouldEqual(result));
    });

    it('`cached` should return decrypted cached result',function() {
      return this.cache.cached('compresskey1',shouldNotRun)
        .then(shouldEqual(result));
    });

    it('`cached` with payload = true should return payload',function() {
      return this.cache.cached('compresskey1',shouldNotRun, {payload:true})
        .then(function(d) {
          assert.equal(d.compressed,true);
          return d.data;
        })
        .then(shouldEqual(result));
    });

    it('`get` should return decrypted cached result',function() {
      return this.cache.get('compresskey1')
        .then(function(d) {
          assert.equal(d.data,result);
        });
    });
  });

  describe('Compressed and Encrypted', function() {
    it('first `cached` should return output',function() {
      return this.cache.cached('compresskey2',testFn,{compressed:true,passphrase:'abc123'})
        .then(shouldEqual(result));
    });

     it('`adapter.get` returns encrypted data',function() {
      var self = this;
      return self.cache.adapter.get('compresskey2')
        .then(function(d) {
          assert.equal(d.__caching__,false);
          assert.notEqual(d.data,result);         
          return zlib.inflateAsync(d.data)
            .then(d => {
              d = d.toString();
              return self.cache.decrypt(d,'abc123');
            });
        })
        .then(shouldEqual(result));
    });

    it('`cached` should return decrypted cached result',function() {
      return this.cache.cached('compresskey2',shouldNotRun,{passphrase:'abc123'})
        .then(shouldEqual(result));
    });
  });
};



