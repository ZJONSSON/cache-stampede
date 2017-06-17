const Promise = require('bluebird');

function shouldError() { throw 'Should have errored';}

module.exports = async function(t,cache) {
  t.test('When fn is async', async function() {
    const result = 'This is the result of the delay test';

    async function testFn() {
      await Promise.delay(600);
      return result;
    }

    await Promise.all([
      cache.adapter.remove('delay-testkey',{all: true}),
      cache.adapter.remove('delay-testkey2',{all: true}),
      cache.adapter.remove('delay-testkey3',{all: true})
    ]);

  
    t.test('when fn is running', async t => {
      cache.cached('delay-testkey',testFn,{info:'TEST'});
      await Promise.delay(10);
      const e = await cache.set('delay-testkey',function() { return 'New Value'; }).then(shouldError,Object);
      t.same(e.message,'KEY_EXISTS','`set` should error when db is __caching__');

      const d = await cache.info('delay-testkey');
      t.same(d,'TEST','cache responds to `info` while fn running');
      
    });

    t.test('after running', async t => {
      const d = await cache.cached('delay-testkey',function() { throw 'Should not run';},{maxRetries:6});
      t.same(d,result,'rerunning should wait for cached results');

      const i = await cache.info('delay-testkey');
      t.same(i,'TEST','cache responds to `info` while fn running');
    });


    t.test('re-run with too short retry', async t => {
      cache.cached('delay-testkey3',testFn);
      await  Promise.delay(10);
      const e = await cache.cached('delay-testkey3',testFn,{maxRetries:1}).then(shouldError,Object);
      t.equal(e.message,'MAXIMUM_RETRIES','fails on MAXIMUM_RETRIES');
    });
    t.end();
  });
};

if (!module.parent) {
  const stampede = require('../../index');
  const path = require('path');
  const cache =  stampede.file(path.join(__dirname,'..','filecache'));
  const t = require('tap');
  module.exports(t,cache);
}