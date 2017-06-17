function shouldNotRun() { throw 'Should not run';}
function shouldError() { throw 'Should have errored';}

module.exports = async function(t, cache) {
  const result = 'This is the result of the encrypted test';

  function testFn() {
    return result;
  }

  await Promise.all([
    cache.adapter.remove('encryptkey',{all: true}),
    cache.adapter.remove('encryptkey2',{all: true})
  ]);

  t.test('Encryption', async t => {
    t.test('passphrase in object', async t => {
      t.test('first `cached`', async t => {
        cache.passphrase = 'testing123';
        const d = await cache.cached('encryptkey',testFn);
        t.same(d,result,'returns decrypted results');
      });

      t.test('`adapter.get`', async t => {
        const d = await cache.adapter.get('encryptkey');
        t.same(d.__caching__,false,'record is no longer __caching__');
        t.ok(d.data !== result,'stored data is encrypted');
        t.same(cache.decrypt(d.data,'testing123'),result,'data can be decrypted');
      });

      t.test('second `cached`', async t => {
        const d = await cache.cached('encryptkey',shouldNotRun);
        t.same(d,result,'returns decrypted data');
      });

      t.test('`cached` with payload = true', async t =>  {
        const d = await cache.cached('encryptkey',shouldNotRun, {payload:true});
        t.same(d.data,result,'returns cached decrypted data ');
      });

      t.test('`get`', async t => {
        const d = await cache.get('encryptkey');
        t.same(d.data,result,'returns decrypted data');
      });
    });

    t.test('modified object passphrase', async t => {
      t.test('`get`', async t => {
        cache.passphrase = 'differentPassPhrase';
        const e = await cache.get('encryptkey').then(shouldError,Object);
        t.same(e.message,'BAD_PASSPHRASE','Errors with BAD_PASSPHRASE');
      });

      t.test('`get` with correct passphrase', async t => {
        const d = await cache.get('encryptkey',{passphrase:'testing123'});
        t.same(d.data,result,'returns decrypted data');
      });
    });

    t.test('passphrase in options', async t => {
      cache.passphrase = undefined;
      t.test('`cached`', async t => {
        const d = await cache.cached('encryptkey2',testFn,{passphrase:'newpassphrase'});
        t.same(d,result,'returns decrypted data');
      });

      t.test('`adapter.get`', async t => {
        const d = await cache.adapter.get('encryptkey2');
        t.same(d.__caching__,false,'record is no longer __caching__');
        t.ok(d.data !== result,'data is encrypted');
        t.same(cache.decrypt(d.data,'newpassphrase'),result,'data can be decrypted');
      });

      t.test('`get` without new passphrase fails', async t => {
        const e = await cache.cached('encryptkey2',testFn).then(shouldError,String);
        t.same(e,'MISSING_PASSPHRASE');
      });

      t.test('`get` with new passphrase works', async t => {
        const d = await cache.cached('encryptkey2',testFn,{passphrase:'newpassphrase'});
        t.same(d,result,'returns the decrypted results');
      });
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