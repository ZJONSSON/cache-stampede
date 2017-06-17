module.exports = async function(t,cache) {
  
  
  return t.test('history', async t => {
    await cache.adapter.remove('mongoHistory-test',{all: true});

    if (!cache.adapter.getHistory) {
      t.comment(`history not available in adapter ${cache.name}`);
      return;
    }

    t.test('searate calls with maxage 0 and different results', async t => {
      t.same(await cache.cached('mongoHistory-test',1,{maxAge:0}),1,'first ok');
      t.same(await cache.cached('mongoHistory-test',2,{maxAge:0}),2,'second different');
      t.same(await cache.cached('mongoHistory-test',3,{maxAge:0}),3,'third different');
    });

    t.test('getHistory', async t => {
      const d = await cache.adapter.getHistory('mongoHistory-test');
      t.same(d.map(d => d.data),[1,2,3],'fetches all records');
    });
    t.end();
  });
};

if (!module.parent) {
  (async () => {
    const stampede = require('../../index');
    const mongodb = require('mongodb');
    const db = await mongodb.MongoClient.connect('mongodb://localhost:27017/stampede_tests', {native_parser:true});
    const collection = db.collection('stampede_tests');
    const cache =  stampede.mongoHistory(collection);
    const t = require('tap');
    await module.exports(t,cache);
    db.close();
  })();
}