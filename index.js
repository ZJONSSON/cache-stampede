var Stampede = require('./stampede'),
    util = require('util');

function MongoStampede(collection,options) {
  if (!(this instanceof MongoStampede))
    return new MongoStampede(collection,options);
  this.adapter = require('./adapters/mongo')(collection);
  Stampede.call(this,options);
}
util.inherits(MongoStampede,Stampede);

function RedisStampede(collection,options) {
  if (!(this instanceof RedisStampede))
    return new RedisStampede(collection,options);
  this.adapter = require('./adapters/redis')(collection);
  Stampede.call(this,options);
}
util.inherits(RedisStampede,Stampede);




module.exports = Stampede;
module.exports.mongo = MongoStampede;
module.exports.redis = RedisStampede;