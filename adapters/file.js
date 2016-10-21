var Promise = require('bluebird'),
    fs = require('fs'),
    path = require('path');

Promise.promisifyAll(fs);

module.exports = function(dir,prefix) {
  return {
    get : function(key,options) {
      if (options && options.find)
        throw new Error('options `find` not supported in file adapter');
      
      return fs.readFileAsync(path.join(dir,key+'.json'))
        .then(function(res) {
          return JSON.parse(res);
        })
        .catch(function() {
          return undefined;
        });
    },

    insert : function(key,d) {
      d._id = key;
      d = JSON.stringify(d,null,2);
      return fs.writeFileAsync(path.join(dir,key+'.json'),d,{flag:'wx'})
        .catch(function(err) {
          if (err.code === 'EEXIST')
            throw new Error('KEY_EXISTS');
          else
            throw err;
        });
    },

    update : function(key,d) {
      d._id = key;
      d = JSON.stringify(d,null,2);
      return fs.writeFileAsync(path.join(dir,key+'.json'),d);
    },

    remove : function(key) {
      return fs.unlinkAsync(path.join(dir,key+'.json'))
        .catch(Object);
    }

  };
};
