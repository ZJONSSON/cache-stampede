const Promise = require('bluebird');

const shouldError = t => d => t.fail(`Should error instead of returning ${JSON.stringify(d)}`);
const shouldNotRun = t => () => t.fail('Should not run');


module.exports = async (t, cache) => t.test('When fn is async', async t => {

  const result = 'This is the result of the delay test';

   await Promise.all([
    cache.adapter.remove('delay-testkey',{all: true}),
    cache.adapter.remove('delay-testkey2',{all: true}),
    cache.adapter.remove('delay-testkey3',{all: true})
  ]);

  const testFn = () => Promise.delay(600).then(() => result);

  t.test('`set` should error when db is __caching__', async t => {
    cache.cached('delay-testkey',testFn,{info:'TEST'});
    await Promise.delay(10);
    let e = await cache.set('delay-testkey', 'New Value').then(shouldError(t), Object);
    t.same(e.message, 'KEY_EXISTS');
  });

  t.test('cache responds to `info` while fn running', async t => {
    const d = await cache.info('delay-testkey');
    t.same(d, 'TEST');
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
  
  t.end();
});