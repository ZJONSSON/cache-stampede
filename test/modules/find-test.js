/* jshint mocha:true */

var assert = require('assert');
var Promise = require('bluebird');

module.exports = function() {
  before(function() {
    var self = this;
    return Promise.all([
      this.cache.adapter.remove('find-test-1',{all: true}),
      this.cache.adapter.remove('find-test-2',{all: true})
    ])
    .then(function() {
      return self.cache.cached('find-test-1',{description: 'test record'},{info:{name:'TEST'}});
    });
  });

  describe('Find',function() {
    it('returns found match intead of fetching new', function() {
      if (this.adapterName.indexOf('mongo') == -1) this.skip();
      return this.cache.cached('find-test-2',function() { throw 'SHOULD_NOT_RUN';},{find:{'info.name':'TEST'}})
        .then(function(d) {
          assert.equal(d.description,'test record');
        });
    });

    it('does not store the new key in case a matching record is found',function() {
      if (this.adapterName.indexOf('mongo') == -1) this.skip();
      return this.cache.get('find-test-2')
        .then(function() { throw 'SHOULD_ERROR';},function(e) {
          assert.equal(e.message,'KEY_NOT_FOUND');
        });
    });
  });
};
