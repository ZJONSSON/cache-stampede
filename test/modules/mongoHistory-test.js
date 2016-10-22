/* jshint mocha:true */

var assert = require('assert');
var Promise = require('bluebird');

module.exports = function() {

  before(function() {
    return this.cache.adapter.remove('mongoHistory-test',{all: true});
  });

  describe('History',function() {
    it('separate calls with maxage 0 return separate results', function() {
      if (this.adapterName !== 'mongoHistory') this.skip();
      var self = this;
      return self.cache.cached('mongoHistory-test',1,{maxAge:0})
        .then(function(d) {
          assert.equal(d,1);
          return self.cache.cached('mongoHistory-test',2,{maxAge:0});
        })
        .then(function(d) {
          assert.equal(d,2);
          return self.cache.cached('mongoHistory-test',3,{maxAge:0});
        })
        .then(function(d) {
          assert.equal(d,3);
        });
    });

    it('getHistory fetches all records',function() {
      if (this.adapterName !== 'mongoHistory') this.skip();
      return this.cache.adapter.getHistory('mongoHistory-test')
        .then(function(d) {
          d = d.map(function(d) {
            return d.data;
          });
          assert.deepEqual(d,[1,2,3]);
        });
    });
  });
};
