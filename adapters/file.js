const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');

Promise.promisifyAll(fs);

module.exports = function(dir,prefix) {
  return {
    get : function(key,options) {
      if (options && options.find)
        throw new Error('options `find` not supported in file adapter');
      
      return fs.readFileAsync(path.join(dir,key+'.json'))
        .then(res =>  {
          res = JSON.parse(res);
          if (res.base64 || (res.compressed && typeof res.data === 'string'))
            res.data = new Buffer(res.data,'base64');
          return res;
        })
        .catch(() => undefined);
    },

    insert : function(key,d) {
      d._id = key;
      if (d.data instanceof Buffer) {
        d.data = d.data.toString('base64');
        d.base64 = true;
      }
      d = JSON.stringify(d,null,2);
      return fs.writeFileAsync(path.join(dir,key+'.json'),d,{flag:'wx'})
        .catch(err => {
          if (err.code === 'EEXIST')
            throw new Error('KEY_EXISTS');
          else
            throw err;
        });
    },

    update : function(key,d) {
      d._id = key;
      if (d.data instanceof Buffer) {
        d.data = d.data.toString('base64');
        d.base64 = true;
      }
      d = JSON.stringify(d,null,2);
      return fs.writeFileAsync(path.join(dir,key+'.json'),d);
    },

    remove : function(key) {
      return fs.unlinkAsync(path.join(dir,key+'.json'))
        .catch(Object);
    }

  };
};
