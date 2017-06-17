const Promise = require('bluebird');

function shouldError() { throw 'Should have errored';}


module.exports = async function(t, cache) {
  if (cache.name !== 'mongo' && cache.name !== 'mongodb') {
    t.comment(`adapter ${cache.name} does not support find`);
    return 
  }

  await Promise.all([
    cache.adapter.remove('find-test-1',{all: true}),
    cache.adapter.remove('find-test-2',{all: true})
  ]);
  
  await cache.cached('find-test-1',{description: 'test record'},{info:{name:'TEST'}});

  return t.test('Find', async t => {
    const d = await cache.cached('find-test-2',function() { throw 'SHOULD_NOT_RUN';},{find:{'info.name':'TEST'}});
    t.same(d.description,'test record', 'returns found match intead of fetching new');

    const e = await cache.get('find-test-2').then(shouldError,Object);
    t.same(e.message,'KEY_NOT_FOUND','does not store new key if matching record was found');
  });
};

if (!module.parent) {
  (async () => {
    const stampede = require('../../index');
    const mongodb = require('mongodb');
    const db = await mongodb.MongoClient.connect('mongodb://localhost:27017/stampede_tests', {native_parser:true});
    const collection = db.collection('stampede_tests');
    const cache =  stampede.mongo(collection);
    cache.name = 'mongo';
    const t = require('tap');
    await module.exports(t,cache);
    db.close();
  })();
}