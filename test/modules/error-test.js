const Promise = require('bluebird');

const shouldError = t => d => t.fail(`Should error instead of returning ${JSON.stringify(d)}`);

module.exports = async (t, cache) => t.test('Function with non-caching error', async t => {

  const adapter = await cache.adapter;
  
  const testFn = async () => {
    await Promise.delay(500);
    throw 'Error';
  };

  await Promise.all([
    adapter.remove('error-testkey',null,{all: true}),
    adapter.remove('error-testkey2',null,{all: true})
  ]);

  t.test('`set` should fail when db is still __caching__', async t =>{
    cache.cached('error-testkey',testFn).catch(Object);
    await Promise.delay(50);
    let e = await cache.set('error-testkey',function() { return 'New Value'; }).then(shouldError, Object);
    t.same(e.message, 'KEY_EXISTS');
  });

  t.test('`cached` should return the correct error', async t => {
    let e = await cache.cached('error-testkey2',testFn).then(shouldError, Object);
    t.same(e.message, 'Error');
  });

  t.test('`get` should show that error was not cached', async t => {
    let e = await cache.get('error-testkey2').then(shouldError, Object);
    t.same(e.message, 'KEY_NOT_FOUND');
  });

  t.end();
});