const Promise = require('bluebird');
const clues = require('clues');

function shouldError() { throw 'Should have errored';}

module.exports = async function(t,cache) {

  cache.clues = true;

  await Promise.all([
    cache.adapter.remove('clues-testkey',{all: true}),
    cache.adapter.remove('clues-testkey2',{all: true}),
    cache.adapter.remove('clues-testkey3',{all: true}),
    cache.adapter.remove('clues-testkey4',{all: true}),
    cache.adapter.remove('clues-testkey5',{all: true})
  ]);

  t.test('Clues formula', {autoend: true}, async t => {
    t.test('with value', async t => {
      
      const logic = { value: () => cache.cached('clues-testkey',42) };

      const d = await clues(logic,'value');
      t.same(d,42,'is cached');
    });


    t.test('formula w/o arguments', async t => {

      const logic = {
        value: () => cache.cached('clues-testkey2',function() { return 42;},{context: logic})
      };

      t.same(await clues(logic,'value'),42,'is cached');
    });

    t.test('formula w/arguments', async t => {

      const logic = {
        a : () => 41,
        value: () => cache.cached('clues-testkey3',function(a) { return a+1;},{context: logic})
      };

      t.same(await logic.value(),42,'is cached');
    });


    t.test('works for array-defined-formula', async t => {

      const logic = {
        a: 41,
        value: () => cache.cached('clues-testkey4',[logic,'a',function(d) { return d+1;}])
      };

      t.same(await logic.value(),42,'is cached');
    });


    t.test('error', async t => {
      
      const logic = {
        a: () => { throw 'FAILS';},
        value: () => cache.cached('clues-testkey5',[logic,function(a) { return a;}])
      };

      const e = await logic.value().then(shouldError,Object);
      t.same(e.message,'FAILS','should return as rejection');
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