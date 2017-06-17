const Promise = require('bluebird');
const zlib = require('zlib');
Promise.promisifyAll(zlib);

function shouldNotRun() { throw 'Should not run';}

module.exports = async function(t,cache) {
  const result = 'This is the result of the encrypted test';

  function testFn() {
    return result;
  }

  await Promise.all([
    cache.adapter.remove('compresskey1',{all: true}),
    cache.adapter.remove('compresskey2',{all: true})
  ]);

  t.test('Compressed', {autoend: true}, t => {
    t.test('first `cached`', async t => {
      const d = await cache.cached('compresskey1',testFn,{compressed:true});
      t.same(d,result,'returns result');
    });

    t.test('`adapter.get`', async t => {
      const d = await cache.adapter.get('compresskey1');
      t.ok(d.data !== result,'encrypted');
      t.same(d.__caching__,false,'with __caching__ === false');
      const e = await zlib.inflateAsync(d.data).then(d => JSON.parse(d));
      t.same(e,result,'results match after encryption');
    });

    t.test('`cached` again', async t => {
      const d = await cache.cached('compresskey1',shouldNotRun);
      t.same(d,result,'returns decrypted cached result');
    });

    t.test('`cached` with payload = true', async t => {
      const d = await cache.cached('compresskey1',shouldNotRun, {payload:true});
      t.same(d.compressed,true,'shows compresed === true');
      t.same(d.data,result,'returns results');
    });

    t.test('`get`', async t => {
      const d = await cache.get('compresskey1');
      t.same(d.data,result,'returns decrypted cached results');
    });
  });

  t.test('Compressed and Encrypted', async t => {

    t.test('first `cached`', async t => {
      const d = await cache.cached('compresskey2',testFn,{compressed:true,passphrase:'abc123'});
      t.same(d,result,'returns output');
    });

    t.test('`get`', async t => {
      const d = await cache.adapter.get('compresskey2');
      t.same(d.__caching__,false,'data in no longer marked __caching__');

      const c = await zlib.inflateAsync(d.data);
      const f = await cache.decrypt(c.toString(),'abc123');
      t.same(f,result,'data is stored compressed and encrypted');
    });

    t.test('second `cached`',async t => {
      const d = await cache.cached('compresskey2',shouldNotRun,{passphrase:'abc123'});
      t.same(d,result,'gets uncompressed and decrypted data from cache');
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