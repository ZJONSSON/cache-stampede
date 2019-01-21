const Promise = require('bluebird');


const shouldError = t => d => t.fail(`Should error instead of returning ${JSON.stringify(d)}`);
const shouldNotRun = t =>() => t.fail('Should not run');

module.exports = async (t, cache) => t.test('With defined maxAge', async t => {
  const result = 'This is the result of the expiry test';

  const adapter = await cache.adapter;
  
  await adapter.remove('maxage-test');

  t.test('on empty cache', async t => {
    t.test('`get` should error', async t => {
      let e = await cache.get('maxage-test',{maxAge:1000}).then(shouldError(t), Object);
      t.same(e.message, 'KEY_NOT_FOUND');
    });

    t.test('`cached` should return function output' ,async t => {
      let d = await cache.cached('maxage-test', () => result,{maxAge:500});
      t.same(d, result);
    });
  });

  t.test('after first `cached`, ', async t => {
    t.test('second `cached` should return from cache', async t => {
      let d = await cache.cached('maxage-test',shouldNotRun(t),{maxAge:500});
      t.same(d, result);
    });
    t.test('`get` should return from cache', async t => {
      let d = await cache.get('maxage-test',shouldNotRun(t),{maxAge:500});
      t.same(d.data, result);
    });
  });

  t.test('after maxAge has passed', async t => {
    t.test('`cached` should re-run function', async t => {
      await Promise.delay(500);
      let d = await cache.cached('maxage-test', () => { return 'UPDATED_VALUE';},{maxAge:500});
      t.same(d, 'UPDATED_VALUE');
    });

    t.test('and `get` return updated value', async t => {
      let d = await cache.get('maxage-test');
      t.same(d.data, 'UPDATED_VALUE');
    });
  });

  t.end();
});
