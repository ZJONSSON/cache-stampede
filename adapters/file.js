const fs = require('fs').promises;
const path = require('path');

module.exports = function(dir,prefix) {
  return {
    get : async (key,options) => {
      let res;
      if (options && options.find)
        throw new Error('options `find` not supported in file adapter');
      
      try {
        res = await fs.readFile(path.join(dir,key+'.json'));
      } catch(e) {
        return undefined;
      }
        
      res = JSON.parse(res);
      if (res.base64 || (res.compressed && typeof res.data === 'string'))
        res.data = Buffer.from(res.data,'base64');
      return res;
    },

    insert : async (key,d) => {
      d._id = key;
      if (d.data instanceof Buffer) {
        d.data = d.data.toString('base64');
        d.base64 = true;
      }
      d = JSON.stringify(d,null,2);

      try {
        return await fs.writeFile(path.join(dir,key+'.json'),d,{flag:'wx'});
      } catch(err) {
        if (err.code === 'EEXIST')
          throw new Error('KEY_EXISTS');
        else
          throw err;
      }
    },

    update : (key,d) => {
      d._id = key;
      if (d.data instanceof Buffer) {
        d.data = d.data.toString('base64');
        d.base64 = true;
      }
      d = JSON.stringify(d,null,2);
      return fs.writeFile(path.join(dir,key+'.json'),d);
    },

    remove : async key => {
      try {
        return await fs.unlink(path.join(dir,key+'.json'));
      } catch(e) {
        return e;
      }
    }

  };
};
