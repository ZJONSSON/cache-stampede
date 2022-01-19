const Promise = require('bluebird');


const shouldError = t => d => t.fail(`Should error instead of returning ${JSON.stringify(d)}`);
const shouldNotRun = t =>() => t.fail('Should not run');

module.exports = async (t, cache) => t.test('With defined maxAge', async t => {
  const result = 'This is the result of the expiry test';

  const adapter = await cache.adapter;
  
  await adapter.remove('maxage-test',null,{all:true});
  await adapter.remove('maxage-test2',null,{all:true});
  await adapter.remove('maxage-test3',null,{all:true});

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
      let d = await cache.get('maxage-test',{maxAge:500});
      t.same(d.data, result);
    });
  });

  // history adapters work differently
  if (!adapter.getHistory) {  
    t.test('`get` clears cache by default', async t => {
      await cache.cached('maxage-test2', () => result,{maxAge:500});
      await Promise.delay(550);
      let d = await (cache.get('maxage-test2',{maxAge:500}).catch(e => e.message));
      t.same('KEY_NOT_FOUND', d);
      d = await (cache.get('maxage-test2').catch(e => e.message));
      t.same('KEY_NOT_FOUND', d);
    });

    t.test('`get` cache clearing can be turned off', async t => {
      await cache.cached('maxage-test3', () => result,{maxAge:500});
      await Promise.delay(550);
      let d = await (cache.get('maxage-test3',{readOnly:true, maxAge:500}).catch(e => e.message));
      t.same('KEY_NOT_FOUND', d);
      d = await (cache.get('maxage-test3').catch(e => e.message));
      t.same(result, d.data);
    });

  }

  t.test('after maxAge has passed', async t => {
    t.test('`cached` should re-run function', async t => {
      // Add small delay greater than expiry to account for any processing time
      await Promise.delay(550);
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
