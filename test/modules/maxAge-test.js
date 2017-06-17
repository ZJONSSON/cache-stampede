const Promise = require('bluebird');

function shouldNotRun() { throw 'Should not run';}
function shouldError() { throw 'Should have errored';}
function shouldEqual(value) { return function(d) { assert.equal(d,value);};}
function errorMsg(msg) { return function(e) { assert.equal(e.message,msg);};}

module.exports = async function(t,cache) {
  const result = 'This is the result of the expiry test';
  
  function testFn() {
    return result;
  }

  await cache.adapter.remove('maxage-test');

  t.test('With defined maxAge', t => {
    t.test('on empty cache', async t => {
      t.test('get', async t => {
        const e = await cache.get('maxage-test',{maxAge:1000}).then(shouldError,Object);
        t.same(e.message,'KEY_NOT_FOUND','`get` should error');
      });

      t.test('`cached`', async t => {
        const d = await cache.cached('maxage-test',testFn,{maxAge:500});
        t.same(d,result,'`cached` should return function output');
      });
      t.end();
    });

    t.test('after first `cached`, ', async t => {
      t.test('second __cached__', async t => {
        const d1 = await cache.cached('maxage-test',shouldNotRun,{maxAge:500});
        t.same(d1,result,'second `cached` should return from cache');
      });

      t.test('`get`', async t => {
        const d2 = await cache.get('maxage-test',shouldNotRun,{maxAge:500});
        t.same(d2.data,result,'`get` should return from cache');
      });
      t.end();
    });

    t.test('after maxAge has passed',async t => {
      t.test('`cached`', async t => {
        await Promise.delay(500);
        const d = await cache.cached('maxage-test',function() { return 'UPDATED_VALUE';},{maxAge:500}); 
        t.same(d,'UPDATED_VALUE','returns updated value');
      });

      t.test('subsequent `get`', async t => {
        const d = await cache.get('maxage-test');
        t.same(d.data,'UPDATED_VALUE','returns updated value');
      });
      t.end();
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