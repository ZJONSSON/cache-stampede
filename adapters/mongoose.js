const mongoAdapter = require('./mongo');

module.exports = function(collection_name,options) {
  options = options || {};
  const mongoose = (options.mongoose) || require('mongoose') ;
  if (!mongoose.models[collection_name]) {
    options.collection = collection_name;
    mongoose.model(collection_name,new mongoose.Schema({
      _id : String,
      data : String,
      info : {},
      __caching__ : Boolean
    },options));
  }

  const adapter = mongoAdapter(mongoose.models[collection_name].collection);
  adapter.close = () => mongoose.connection.close();
  return adapter;
};
