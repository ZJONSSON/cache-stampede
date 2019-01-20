const Promise = require('bluebird');
const zlib = require('zlib');
Promise.promisifyAll(zlib);

const shouldNotRun = t => () => t.fail('Should not run');

module.exports = async (t, cache) => t.test('Compressed', async t => {
  
  const result = 'This is the result of the encrypted test';

  function testFn() {
    return result;
  }

  await Promise.all([
    cache.adapter.remove('compresskey1',{all: true}),
    cache.adapter.remove('compresskey2',{all: true})
  ]);

  t.test('first `cached` should return output', async t => {
    let d = await cache.cached('compresskey1',testFn,{compressed:true});
    t.same(d, result);
  });

  t.test('`adapter.get` returns encrypted data', async t => {
    let d = await cache.adapter.get('compresskey1');
    const data = await zlib.inflateAsync(d.data).then(d => JSON.parse(d));
    t.same(data, result);
    t.same(d.__caching__,false);
    t.notEqual(d.data,result);
  });

  t.test('`cached` should return decrypted cached result', async t => {
    let d = await cache.cached('compresskey1',shouldNotRun(t));
    t.same(d, result);
  });

  t.test('`cached` with payload = true should return payload', async t => {
    let d = await cache.cached('compresskey1',shouldNotRun(t), {payload:true});
    t.same(d.compressed, true);
    t.same(d.data, result);
  });

  t.test('`get` should return decrypted cached result', async t => {
    let d = await cache.get('compresskey1');
    t.same(d.data, result);
  });


  t.test('Compressed and Encrypted', async t => {
    t.test('first `cached` should return output', async t => {
      let d = await cache.cached('compresskey2',testFn,{compressed:true,passphrase:'abc123'});
      t.same(d, result);
    });

     t.test('`adapter.get` returns encrypted data', async t => {
      let d = await cache.adapter.get('compresskey2');
      let encrypted = await zlib.inflateAsync(d.data);
      let data = await cache.decrypt(encrypted.toString(), 'abc123');
      t.same(data, result);
    });

    t.test('`cached` should return decrypted cached result', async t => {
      let d = await cache.cached('compresskey2',shouldNotRun(t),{passphrase:'abc123'});
      t.same(d, result);
    });
    t.end();
  });

  t.end();
});