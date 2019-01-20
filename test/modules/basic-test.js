module.exports = async (t, cache) => t.test('Basic test', async t => {

  const shouldError = t => d => t.fail(`Should error instead of returning ${JSON.stringify(d)}`);
  var result = 'This is the result of the basic test';

  function testFn() {
    return result;
  }

  await Promise.all([
    cache.adapter.remove('testkey',{all: true}),
    cache.adapter.remove('rawkey',{all: true})
  ]);

  t.test('on empty cache', async t => {
    let d;
    d = await cache.get('testkey').then(shouldError(t),Object);
    t.same(d.message, 'KEY_NOT_FOUND', '`get` should error');

    d = await cache.cached('testkey', testFn);
    t.same(d, result, '`cached` should return function output');
  });

  t.test('after first `cached`', async t => {
    let d;
    d = await cache.cached('testkey',function() { throw 'Should not run fn';});
    t.same(d, result, 'second `cached` should load from cache');

    d = await cache.get('testkey');
    t.same(d.data, result, '`get` should load from cache');
  });

  t.test('Caching a value', async t => {
    let d;
    d =  await cache.cached('value','VALUE');
    t.same(d, 'VALUE', '`cached` returns the value');

    d = await cache.get('value');
    t.same(d.data, 'VALUE', '`get` returns the value');
  });

  t.test('Caching with payload = true', async t => {
    t.test('`cached` returns the payload', async t => {
      let d = await cache.cached('rawkey',testFn,{payload:true})
      t.same(d.data,result);
      t.same(d.__caching__,false);
      t.same(typeof d.updated.getMonth,'function');
    });

    t.test('subsequent `cached` returns the payload',async t => {
      let d = await cache.cached('rawkey',shouldError(t),{payload:true});
      t.same(d.data,result);
      t.same(d.__caching__,false);
      t.same(typeof d.updated.getMonth,'function');
    });
  });


  t.test('Getting from pre-cached', async t => {
    let d;
    d = await cache.cached('prekey1',function() { throw 'Should not run';},{preCache:{prekey1:{data:42}}});
    t.same(d,42, 'returns available value');
       
    d = await cache.cached('prekey1',function() { throw 'Should not run';},{payload:true, preCache:{prekey1:{data:42}}});       
    t.same(d.data,42, 'returns available value raw');
  });

  t.end();
});