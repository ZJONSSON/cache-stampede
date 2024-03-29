const Promise = require('bluebird');

  const shouldError = t => d => t.fail(`Should error instead of returning ${JSON.stringify(d)}`);
  const shouldNotRun = t =>() => t.fail('Should not run');

module.exports = async (t, cache) => t.test('With defined expiry', async t => {

  const adapter = await cache.adapter;

  const result = 'This is the result of the expiry test';
  
  const testFn = () => result;

  await adapter.remove('expiry-test',null,{all: true});

  t.test('on empty cache',async t => {
    t.test('`get` should error', async t => {
      let e = await cache.get('expiry-test').then(shouldError(t), Object);
      t.same(e.message, 'KEY_NOT_FOUND');
    });

    t.test('`cached` should return function output', async t => {
      let d = await cache.cached('expiry-test',testFn,{expiry:200});
      t.same(d, result);
    });
  });

  t.test('after first `cached`, ', async t => {
    t.test('second `cached` should return from cache', async t => {
      let d = await cache.cached('expiry-test',shouldNotRun(t),{expiry:200});
      t.same(d, result);
    });

    t.test('`get` should return from cache', async t => {
      let d = await cache.get('expiry-test',shouldNotRun(t),{expiry:200});
      t.same(d.data, result);
    });
  });

  t.test('after cache expired', async t => {
    t.test('`cached` should re-run function', async t => {
      // Add small delay greater than expiry to account for any processing time
      await Promise.delay(300);
      let d = await cache.cached('expiry-test',function() { return 'UPDATED_VALUE';},{expiry:200});
      t.same(d, 'UPDATED_VALUE');
    });

    t.test('and `get` return updated value', async t => {
      let d = await cache.get('expiry-test');
      t.same(d.data, 'UPDATED_VALUE');
    });
 
  });

  t.end();
});
