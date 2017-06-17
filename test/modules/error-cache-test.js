const Promise = require('bluebird');

function shouldNotRun() { throw 'Should not run';}
function shouldError() { throw 'Should have errored';}

module.exports = async function(t,cache) {
  t.test('Error with `cache` as true',  async t => {
    async function testFn() {
      await Promise.delay(500);
      throw {message:'Error',cache:true};
    }

    await cache.adapter.remove('errorcache-testkey',{all: true});

  
    t.test('on empty cache', async t => {
      const e = await cache.cached('errorcache-testkey',testFn).then(shouldError,Object);
      t.same(e.message,'Error','returns rejection');
    });

    t.test('requesting cached record', async t => {
      const e = await cache.cached('errorcache-testkey',shouldNotRun).then(shouldError,Object);
      t.same(e.message,'Error','returns rejection from cache');
    });

    t.test('`get` on cached record', async t => {
      const e = await cache.get('errorcache-testkey').then(shouldError,Object);
      t.same(e.message,'Error','returns rejection from cache');
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