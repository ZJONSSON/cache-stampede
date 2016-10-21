var assert = require('assert'),
    Promise = require('bluebird'),
    clues = require('clues');

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
    this.cache.clues = true;
    return Promise.all([
      this.cache.adapter.remove('clues-testkey',{all: true}),
      this.cache.adapter.remove('clues-testkey2',{all: true}),
      this.cache.adapter.remove('clues-testkey3',{all: true}),
      this.cache.adapter.remove('clues-testkey4',{all: true}),
      this.cache.adapter.remove('clues-testkey5',{all: true})
    ]);
  });

  describe('Clues formula',function() {

    /*it('regular formula returns value',function() {
      var self = this;
      var logic = {
        value: function() {
          return self.cache.cached('clues-testkey',function() { return 42;});
        }
      };
      return clues(logic,'value').then(console.log)
    });*/


    it('works for value',function() {
      var self = this;
      var logic = {
        value: function() {
          return self.cache.cached('clues-testkey',42);
        }
      };
      return clues(logic,'value')
        .then(function(d) {
          assert.equal(d,42);
        },shouldError);

    });


    it('works for formula w/o arguments',function() {
      var self = this;
      var logic = {
        value: function() {
          return self.cache.cached('clues-testkey2',function() { return 42;},{clues: true});
        }
      };
      return clues(logic,'value')
        .then(function(d) {
          assert.equal(d,42);
        },shouldError);

    });

    it('works for formula w/arguments',function() {
      var self = this;
      var logic = {
        a : function() {
          return 41;
        },
        value: function() {
          return self.cache.cached('clues-testkey3',function(a) { return a+1;},{clues: true});
        }
      };
      return clues(logic,'value')
        .then(function(d) {
          assert.equal(d,42);
        },shouldError);
    });


    it('works for array-defined-formula',function() {
      var self = this;
      var logic = {
        a: 41,
        value: function() {
          return self.cache.cached('clues-testkey4',['a',function(d) { return d+1;}],{clues: true});
        }
      };
      return clues(logic,'value')
        .then(function(d) {
          assert.equal(d,42);
        },shouldError);
    });


    it('should return error as rejection',function() {
      var self = this;
      var logic = {
        a: function() { throw 'FAILS';},
        value: function() {
          return self.cache.cached('clues-testkey5',function(a) { return a;},{clues: true});
        }
      };
      return clues(logic,'value').then(shouldError,function(e) {
        assert.equal(e.message,'FAILS');
      });
    });
  });
};