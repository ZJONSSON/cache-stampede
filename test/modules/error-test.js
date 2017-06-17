const Promise = require('bluebird');

function shouldError() { throw 'Should have errored';}

module.exports = async function(t,cache) {

  async function testFn() {
    await Promise.delay(500);
    throw 'Error';
  }

  await Promise.all([
    cache.adapter.remove('error-testkey',{all: true}),
    cache.adapter.remove('error-testkey2',{all: true})
  ]);

  t.test('Function with non-caching error', async t => {

    t.test('while db is still __cachine__', async t => {
      cache.cached('error-testkey',testFn).catch(Object);
      await  Promise.delay(50);
      const e = await cache.set('error-testkey',function() { return 'New Value'; }).then(shouldError,Object);
      t.same(e.message,'KEY_EXISTS','`set` should fail');
    });

    t.test('__cached___', async t => {
      const e = await cache.cached('error-testkey2',testFn).then(shouldError,Object);
      t.same(e.message,'Error','returns the correct error');
    });

    t.test('`get`', async t => {
      const e = await cache.get('error-testkey2').then(shouldError,Object);
      t.same(e.message,'KEY_NOT_FOUND','`get` should show that error was not cached');
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