const Promise = require('bluebird');
const clues = require('clues');

const shouldError = t => d => t.fail(`Should error instead of returning ${JSON.stringify(d)}`);

module.exports = async (t, cache) => t.test('Clues formula', async t => {
  
  cache.clues = true;

  await Promise.all([
    cache.adapter.remove('clues-testkey',{all: true}),
    cache.adapter.remove('clues-testkey2',{all: true}),
    cache.adapter.remove('clues-testkey3',{all: true}),
    cache.adapter.remove('clues-testkey4',{all: true}),
    cache.adapter.remove('clues-testkey5',{all: true})
  ]);

  /*t.test('regular formula returns value', async t => {
    var self = this;
    var logic = {
      value: function() {
        return self.cache.cached('clues-testkey', async t => { return 42;});
      }
    };
    return clues(logic,'value').then(console.log)
  });*/


  t.test('works for value', async t => {
    const logic = {
      value: function() {
        return cache.cached('clues-testkey',42);
      }
    };
    let d = await clues(logic,'value');
    t.same(d, 42);
  });


  t.test('works for formula w/o arguments', async t => {
    const logic = {
      value: function() {
        return cache.cached('clues-testkey2', () => { return 42;},{clues: true});
      }
    };
    let d = await clues(logic,'value');
    t.same(d, 42);
  });

  t.test('works for formula w/arguments', async t => {
    const logic = {
      a : function() {
        return 41;
      },
      value: function() {
        return cache.cached('clues-testkey3',function(a) { return a+1;},{clues: true});
      }
    };
    let d = await clues(logic,'value');
    t.same(d, 42);
  });


  t.test('works for array-defined-formula', async t => {
    var logic = {
      a: 41,
      value: function() {
        return cache.cached('clues-testkey4',['a',function(d) { return d+1;}],{clues: true});
      }
    };
    let d = await clues(logic,'value');
    t.same(d, 42);
  });


  t.test('should return error as rejection', async t => {
    const logic = {
      a: function() { throw 'FAILS';},
      value: function() {
        return cache.cached('clues-testkey5',function(a) { return a;},{clues: true});
      }
    };
    let e = await clues(logic,'value').then(shouldError(t), Object);
    t.same(e.message,'FAILS');
  });

  t.end();
});