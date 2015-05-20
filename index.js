var Stampede = require('./stampede'),
    util = require('util');

module.exports = Stampede;

['file','mongo','mongoose','redis'].forEach(function(key) {
  var Adapter = function(collection,options) {
    if (!(this instanceof Adapter))
      return new Adapter(collection,options);
    this.adapter = require('./adapters/'+key)(collection,options);
    Stampede.call(this,options);
  };
  util.inherits(Adapter,Stampede);
  module.exports[key] = Adapter;
});