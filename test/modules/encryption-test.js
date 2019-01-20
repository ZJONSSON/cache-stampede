const shouldError = t => d => t.fail(`Should error instead of returning ${JSON.stringify(d)}`);
const shouldNotRun = t => () => t.fail('Should not run');


module.exports = async (t, cache) => t.test('Encryption', async t => {
  
  const result = 'This is the result of the encrypted test';

  function testFn() {
    return result;
  }

  await Promise.all([
    cache.adapter.remove('encryptkey',{all: true}),
    cache.adapter.remove('encryptkey2',{all: true})
  ]);

  t.test('passphrase in object', async t => {
    t.test('first `cached` should return output', async t => {
      cache.passphrase = 'testing123';
      let d = await cache.cached('encryptkey',testFn);
      t.same(d, result);
    });

    t.test('`adapter.get` returns encrypted data', async t => {
      let d = await cache.adapter.get('encryptkey');      
      t.equal(d.__caching__,false);
      t.notEqual(d,result);
      t.equal(cache.decrypt(d.data,'testing123'),result);
    });

    t.test('`cached` should return decrypted cached result', async t => {
      let d = await cache.cached('encryptkey',shouldNotRun(t));
      t.same(d, result);
    });

    t.test('`cached` with payload = true should return payload', async t => {
      let d = await cache.cached('encryptkey',shouldNotRun(t), {payload:true});
      t.same(d.data, result);
    });


    t.test('`get` should return decrypted cached result', async t => {
      const d = await cache.get('encryptkey');
      t.same(d.data, result);
    });

    t.end();
  });


  t.test('modified object passphrase',async t => {
    t.test('`get` should error', async t => {
      cache.passphrase = 'differentPassPhrase';
      let e = await cache.get('encryptkey').then(shouldError(t),Object);
      t.same(e.message, 'BAD_PASSPHRASE');
    });

    t.test('`get` with correct passphrase works',async t => {
      let d = await cache.get('encryptkey',{passphrase:'testing123'});
      t.same(d.data, result);
    });

    t.end();
  });

  t.test('passphrase in options', async t => {
    t.test('`cached` works first time',async t => {
      let d = await cache.cached('encryptkey2',testFn,{passphrase:'newpassphrase'});
      t.same(d, result);
    });

    t.test('`adapter.get` returns encrypted data', async t => {
      let d = await cache.adapter.get('encryptkey2');
      t.equal(d.__caching__,false);
      t.notEqual(d,result);
      t.equal(cache.decrypt(d.data,'newpassphrase'),result);
    });

    t.test('`get` without new passphrase fails', async t => {
      let e = await cache.cached('encryptkey2',testFn).then(shouldError(t), Object);
      t.same(e.message, 'BAD_PASSPHRASE');
    });

    t.test('`get` with new passphrase works', async t => {
      let d = await cache.cached('encryptkey2',testFn,{passphrase:'newpassphrase'});
      t.same(d, result);
      delete cache.passphrase;
    });

    t.end();
  });

  t.end();
});