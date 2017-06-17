const Promise = require('bluebird');

function shouldNotRun() { throw 'Should not run';}
function shouldError() { throw 'Should have errored';}

module.exports = async function(t,cache) {
  const result = 'This is the result of the expiry test';
  
  function testFn() {
    return result;
  }

  await cache.adapter.remove('expiry-test',{all: true});

  t.test('With defined expiry', async t => {
    t.test('on empty cache',async t => {
      const e = await cache.get('expiry-test').then(shouldError,Object);
      t.same(e.message,'KEY_NOT_FOUND','`get` should fail');

      const d = await cache.cached('expiry-test',testFn,{expiry:200});
      t.same(d,result,'`cached` returns results');
    });

    t.test('after first `cached`, ', async t => {
      const d = await cache.cached('expiry-test',shouldNotRun,{expiry:200});
      t.same(d,result,'second `cached` returns results from cache');

      const g = await cache.get('expiry-test',shouldNotRun,{expiry:200});
      t.same(g.data,result,'`get` returns results from cache');
    });
      
    t.test('after cache expired', async t => {
      await Promise.delay(200);
      const d = await cache.cached('expiry-test',function() { return 'UPDATED_VALUE';},{expiry:200});
      t.same(d,'UPDATED_VALUE','`cached` re-runs function');

      const g = await cache.get('expiry-test');
      t.same(g.data,'UPDATED_VALUE','`get` returns updated value');
    });
  });
};

if (!module.parent) {
  const stampede = require('../../index');
  const path = require('path');
  const cache =  stampede.file(path.join(__dirname,'..','filecache'));
  const t = require('tap');
  module.exports(t,cache);
}