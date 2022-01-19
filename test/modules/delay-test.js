const Promise = require('bluebird');

const shouldError = t => d => t.fail(`Should error instead of returning ${JSON.stringify(d)}`);
const shouldNotRun = t => () => t.fail('Should not run');

module.exports = async (t, cache) => t.test('When fn is async', async t => {

  const result = 'This is the result of the delay test';

  const adapter = await cache.adapter;

   await Promise.all([
    adapter.remove('delay-testkey',null,{all: true}),
    adapter.remove('delay-testkey2',null,{all: true}),
    adapter.remove('delay-testkey3',null,{all: true})
  ]);

  let counter = 0;

  const testFn = async () => {
    await Promise.delay(600);
    counter++;
    return result;
  };

  const resultPromise = Promise.resolve(cache.cached('delay-testkey',testFn,{info:'TEST'}));
  await Promise.delay(50);
  const setPromise = cache.set('delay-testkey', 'New Value').then(shouldError(t), Object);
  const infoPromise = cache.info('delay-testkey');

   t.test('cache responds to `info` while fn running', async t => {
    const d = await infoPromise;
    t.ok(resultPromise.isPending(),'fn is still running');
    t.same(d, 'TEST', 'info result matches');
  });

  t.test('`set`--should error when db is __caching__', async t => {
    t.ok(resultPromise.isPending(),'fn is still running');
    const e = await setPromise;
    t.same(e.message, 'KEY_EXISTS','rejects with KEY_EXISTS');
  });

  t.test('re-running should wait for cached results', async t => {
    let d = await cache.cached('delay-testkey',shouldNotRun(t),{maxRetries:6});
    t.same(d, result);
  });

  t.test('return the request info after running', async t => {
    let d = await cache.info('delay-testkey');
    t.same(d, 'TEST');
  });

  t.test('re-running with zero delay should fail MAXIMUM_RETRIES', async t =>{
    cache.cached('delay-testkey2',testFn);
    await Promise.delay(50);
    let e = await cache.cached('delay-testkey2',testFn,{retryDelay:0}).then(shouldError(t),Object);
    t.same(e.message, 'MAXIMUM_RETRIES');
  });

  t.test('verify that the original function was only called once', async t => {
    t.same(counter, 1);
  });
  
  t.end();
});