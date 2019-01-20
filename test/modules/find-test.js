/* jshint mocha:true */

const Promise = require('bluebird');

module.exports = async (t, cache, name) => t.test('Find', async t => {

  const adapter = await cache.adapter;
  
  await Promise.all([
    adapter.remove('find-test-1',{all: true}),
    adapter.remove('find-test-2',{all: true})
  ]);

  await cache.cached('find-test-1',{description: 'test record'},{info:{name:'TEST'}});

  t.test('returns found match intead of fetching new', async t => {
    if (name.indexOf('mongo') == -1) return t.ok(true,'Find not available');

    let d = await cache.cached('find-test-2',function() { throw 'SHOULD_NOT_RUN';},{find:{'info.name':'TEST'}});
    t.same(d.description, 'test record');
  });

  t.test('does not store the new key in case a matching record is found', async t => {
    //if (name.indexOf('mongo') == -1) return t.ok();
    let e = await cache.get('find-test-2').then(function() { throw 'SHOULD_ERROR';}, Object);
    t.same(e.message, 'KEY_NOT_FOUND');
  });

  t.end();
});