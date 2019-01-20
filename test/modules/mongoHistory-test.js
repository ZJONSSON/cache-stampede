module.exports =  async (t, cache, name) => t.test('History', async t => {
  if (name !== 'mongoHistory') return t.ok(true,'History not availble for this adapter');

  await cache.adapter.remove('mongoHistory-test',{all: true});

  t.test('separate calls with maxage 0 return separate results', async t => {
    let d = await cache.cached('mongoHistory-test',1,{maxAge:0});
    t.same(d, 1);
    d = await cache.cached('mongoHistory-test',2,{maxAge:0});
    t.same(d, 2);
    d = await cache.cached('mongoHistory-test',3,{maxAge:0});
    t.same(d, 3);
  });

  t.test('getHistory fetches all records', async t => {
    let d = await cache.adapter.getHistory('mongoHistory-test');
    t.same(d.map(d => d.data),[1,2,3]);
  });

  t.end();
});