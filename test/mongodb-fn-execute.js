const stampede = require('../index');
const Promise = require('bluebird');

module.exports = async (t, createCacheCb) => t.test('Fn Execute', async t => {

  let counter = 0,
      errors = 0,
      lastKeySeen = null;

  let cache = await createCacheCb({
    whenFnExecuted: (key, d) => {
      lastKeySeen = key;
      if (d.error) {
        errors++;
      }
      else {
        counter++;
      }
    }
  })

  const adapter = await cache.adapter;

  await Promise.all([
    adapter.remove('testkey',{all: true}),
    adapter.remove('testkey2',{all: true}),
    adapter.remove('testkey3',{all: true})
  ]);


  const result = 'This is the result of the basic test';

  function testFn() {
    return result;
  }

  await t.test('fn should trigger', async t => {
    d = await cache.cached('testkey', testFn);
    t.same(d, result, '`cached` should return function output');

    t.same(errors, 0, 'no errors');
    t.same(counter, 1, 'counter triggered');
    t.same(lastKeySeen, 'testkey', 'correct key')
  });

  await t.test('fn should NOT trigger again', async t => {
    d = await cache.cached('testkey', testFn);
    t.same(d, result, '`cached` should return function output');

    t.same(errors, 0, 'no errors');
    t.same(counter, 1, 'counter triggered');
    t.same(lastKeySeen, 'testkey', 'correct key')
  });

  await t.test('fn should update key', async t => {
    d = await cache.cached('testkey2', testFn);
    t.same(d, result, '`cached` should return function output');

    t.same(errors, 0, 'no errors');
    t.same(counter, 2, 'counter triggered');
    t.same(lastKeySeen, 'testkey2', 'correct key')
  });

  await t.test('fn should mark errors', async t => {
    d = await cache.cached('testkey3', () => {
      throw {message:'Error',cache:true};
    }).catch(e => 'ok');

    t.same(d, 'ok', '`cached` should return function output');

    t.same(errors, 1, 'no errors');
    t.same(counter, 2, 'counter triggered');
    t.same(lastKeySeen, 'testkey3', 'correct key')
  });

  await t.test('fn should refresh on maxage', async t => {
    await Promise.delay(100);

    d = await cache.cached('testkey', () => {
      return 'woop';
    }, { maxAge: 50 });

    t.same(d, 'woop', '`cached` should return function output');

    t.same(errors, 1, 'no errors');
    t.same(counter, 3, 'counter triggered');
    t.same(lastKeySeen, 'testkey', 'correct key')
  });

  if (adapter.close) adapter.close();
});