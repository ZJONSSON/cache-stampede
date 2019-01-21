const Promise = require('bluebird');

const shouldNotRun = t => () => t.fail('Should not run');


module.exports = async (t, cache) => t.test('Error with `cache` as true', async t => {
  
  const testFn = async () => {
    await Promise.delay(500);
    throw {message:'Error',cache:true};
  };
  
  await cache.adapter.remove('errorcache-testkey',{all: true});

  t.test('should return as rejected promise',async t => {
    let e = await cache.cached('errorcache-testkey',testFn).then(d => t.fail(`Should error '${d}`), Object);
    t.same(e.message, 'Error');
  });

  t.test('second `cache` should return same rejection from cache', async t => {
    let e = await cache.cached('errorcache-testkey',shouldNotRun(t)).then(d => t.fail(`Should error '${JSON.stringify(d)}`), Object);
    t.same(e.message, 'Error');
  });

  t.test('`get` should return same rejection', async t => {
    let e = await cache.get('errorcache-testkey').then(d => t.fail(`Should error '${d}`), Object);
    t.same(e.message, 'Error');
  });
  
  t.end();
});