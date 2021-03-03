const fs = require('fs');
const path = require('path');
const stampede = require('../index');
const Promise = require('bluebird');

module.exports = async t => {

  let adapters = ['mongodb', 'mongoHistory'];

  for (let i = 0; i < adapters.length; i++) {
    let adapter = adapters[i];
    await t.test('fnExecute - ' + adapter, async t => {
      let counter = 0,
          errors = 0,
          lastKeySeen = null;

      const mongodb = require('mongodb');
      Promise.promisifyAll(mongodb.MongoClient);
      const client = await mongodb.MongoClient.connect('mongodb://mongodb:27017/stampede_tests', {native_parser:true});
      let cacheStampede = stampede[adapter](Promise.resolve(client.collection('stampede_tests_mongodb_fn_execute' + Date.now())), {
        whenFnExecuted: (key, d) => {
          lastKeySeen = key;
          if (d.error) {
            errors++;
          }
          else {
            counter++;
          }
        }
      });

      const result = 'This is the result of the basic test';

      function testFn() {
        return result;
      }

      await t.test('fn should trigger', async t => {
        d = await cacheStampede.cached('testkey', testFn);
        t.same(d, result, '`cached` should return function output');

        t.same(errors, 0, 'no errors');
        t.same(counter, 1, 'counter triggered');
        t.same(lastKeySeen, 'testkey', 'correct key')
      });

      await t.test('fn should NOT trigger again', async t => {
        d = await cacheStampede.cached('testkey', testFn);
        t.same(d, result, '`cached` should return function output');

        t.same(errors, 0, 'no errors');
        t.same(counter, 1, 'counter triggered');
        t.same(lastKeySeen, 'testkey', 'correct key')
      });

      await t.test('fn should update key', async t => {
        d = await cacheStampede.cached('testkey2', testFn);
        t.same(d, result, '`cached` should return function output');

        t.same(errors, 0, 'no errors');
        t.same(counter, 2, 'counter triggered');
        t.same(lastKeySeen, 'testkey2', 'correct key')
      });

      await t.test('fn should mark errors', async t => {
        d = await cacheStampede.cached('testkey3', () => {
          throw {message:'Error',cache:true};
        }).catch(e => 'ok');

        t.same(d, 'ok', '`cached` should return function output');

        t.same(errors, 1, 'no errors');
        t.same(counter, 2, 'counter triggered');
        t.same(lastKeySeen, 'testkey3', 'correct key')
      });

      await t.test('fn should refresh on maxage', async t => {
        await Promise.delay(100);

        d = await cacheStampede.cached('testkey', () => {
          return 'woop';
        }, { maxAge: 50 });

        t.same(d, 'woop', '`cached` should return function output');

        t.same(errors, 1, 'no errors');
        t.same(counter, 3, 'counter triggered');
        t.same(lastKeySeen, 'testkey', 'correct key')
      });
          
      client.close();
    });
  }

  t.end();
};

if (!module.parent) module.exports(require('tap')).catch(e => console.error(e))