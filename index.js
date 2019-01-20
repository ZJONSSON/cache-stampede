var Stampede = require('./stampede');

module.exports = function() {
  return new Stampede(...arguments);
};

['file','mongo','mongodb','mongoose','redis','mongoHistory','dynamodb','gcloudDatastore'].forEach(function(key) {
	module.exports[key] = function(collection, options) {
		options = options || {};
		options.adapter = require('./adapters/'+key)(collection,options);
		return new Stampede(options);
	};
});
