const mongoAdapter = require('./mongodb');

module.exports = async function(collection_name,options) {
  options = options || {};
  let mongoose = (options.mongoose) || require('mongoose') ;
  if (!mongoose.models[collection_name]) {
    options.collection = collection_name;
    mongoose.model(collection_name,new mongoose.Schema({
      _id : String,
      data : String,
      info : {},
      __caching__ : Boolean
    },options));
  }

  const adapter = await mongoAdapter(mongoose.models[collection_name].collection);
  adapter.close = () => mongoose.connection.close();
  return adapter;
};
