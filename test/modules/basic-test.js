function shouldError() { throw 'Should have errored';}

module.exports = async function(t,cache) {
  t.test('basic test', {autoend: true}, async t => {
    const result = 'This is the result of the basic test';

    function testFn() {
      return result;
    }

    await Promise.all([
      cache.adapter.remove('testkey',{all: true}),
      cache.adapter.remove('rawkey',{all: true})
    ]);

  
    t.test('on empty cache', async t => {
      const e = await cache.get('testkey').then(shouldError,Object);
      t.same(e.message,'KEY_NOT_FOUND','get should error');

      const d = await cache.cached('testkey',testFn);
      t.same(d,result,'`cached` should return fn output');
    });

    t.test('after first `cached`', async t => {
      const d = await cache.cached('testkey', () => { throw 'Should not run fn';});
      t.same(d,result,'should return output without running fn');
    });

    t.test('`get` on the cache key', async t => {
      const d = await cache.get('testkey');
      t.same(d.data,result,'should load from cache');
    });

    t.test('caching a value not a fn', async t => {
      const d = await cache.cached('value','VALUE');
      t.same(d,'VALUE','`cached` returns the value');

      const g = await cache.get('value');
      t.same(g.data,'VALUE','`get` returns the value');
    });


    t.test('caching with payload = true', async t => {
      const d = await cache.cached('rawkey',testFn,{payload: true});
      t.same(d.data,result,'returns payload');
      t.same(d.__caching__,false,'___caching___ is false when done');
      t.same(typeof d.updated.getMonth,'function','`updated` is a date');

      const g = await cache.cached('rawkey',shouldError,{payload: true});
      t.same(g.data,result,'subsequent cached returns data');
    });

    t.test('defined preCache', async t => {
      const d = await cache.cached('prekey1',function() { throw 'Should not run'; },{preCache: {prekey1:{data: 42}}});
      t.same(d,42,'`cached` uses preCache value');
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