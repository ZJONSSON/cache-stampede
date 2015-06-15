# cache-stampede
Most caching libraries do not place a variable into cache until its value has been resolved.  When multiple requests for the same key arrive at the same time, all of them will work on resolving the cached key (instead of only the first one) and then each of them will try to update the cache when resolved (i.e. [cache stampede](http://en.wikipedia.org/wiki/Cache_stampede)).   

In `cache-stampede`, the first request to see an empty cache results for a particular key will immediately register the key in the cache as `{__caching__ : true }` and move on the resolve the results.  When the variable has been resolved the cache is updated with the results.  Any subsequent request that see the variable as  `{__caching__ : true} ` will wait for  `retryDelay ` milliseconds and then try polling the cache again (until `maxRetries` have been made).

## Initialization
Four basic database adapters are provided.
* `require('cache-stampede').mongo(mongo_collection_object,[options])`
* `require('cache-stampede').mongoose(collection_name,[options])`
* `require('cache-stampede').redis(redis_client,[options])`
* `require('cache-stampede').file(directory,[options])`

The relevant database libraries (mongo, mongoose and redis) are only included as dev depdencies and are not installed through regular npm install.  You only need to install them if you want to run tests (mocha).  You can specify the particular `mongoose` object you want to use, as a property `mongoose` in `options`.  The file adapter maintains a list of files (named by the respective keys) the specified directory and does not require any third party database servers.  The `mongo` adapter allows you to specify the collection as a promise to deliver a collection object (optional).

This library can be initialized with a custom adapter.  A custom adapter needs to provide `get`, `insert`, `update` and `remove` functions which should return Promise A+ compliant promises.  The `insert` method should return `KEY_EXISTS` error if a key already exists in the datastore and the `get` method should return `null` or `undefined` if a key was not found.  Please note:  

## Methods

#### `stampede.cached(key,fn,[options])`
This function either returns a cached value for the supplied key or attempts to resolve the value and update the cache, returning a promise on the results.  If an `info` property is defined in the options, it will be stored (and available) immediately.  This function is explicitly bound to the stampede object and can be passed directly to consumers of the cache without having to bind it separately.

#### `stampede.get(key,[options],[retry])`
Retrieve the supplied key from the cache. If the variable is __caching__ the function will retry until `maxRetries` is reached.  The resulting promise will either be resolved with the cached value or errored with the message `MAX_RETRIES`.  The retry parameter is internally used to keep track of how many retries have been made (if any).  If `expiry` was defined when the key was defined and it has expired, the key will be deleted and `KEY_NOT_FOUND` error thrown.

#### `stampede.set(key,fn,[options])`
Set the supplied key as the result of the supplied function and return a promise.  The function can either return a value or a promise.  If `fn` is not a function, the cache will be set to the value of this argument.  If the key already exists in the cache, the promise will return a `E11000` error, otherwise the resolved value will be returned. If an `info` property is defined in the options, it will be stored (and available) immediately. If option upsert is true this function will overwrite any current value.

#### `stampede.info(key)`
Returns the `info` for the supplied key if this key is either caching or finished running.


## Additional controls

#### Retry and expiry
Optional  control options are `maxRetries` and `retryDelay` and `expiry`  (in ms).  They are applied as default options to any request that doesn't explicitly specify them. 

#### Encyption
You can (optional) specify `passphrase` and `algo` (defaults to `aes192`) when you require the module, to encrypt/decrypt all data that flows through the cache.  Any record that was saved with a passphrase will be encrypted and have the property `encrypted` equal to `true` in the database record.  You can also specify a record-specific `passphrase` in the options of each `cached`, `get` and `set` command.

#### preCache
When processing bulk-data it is often conventient to load data in bulk from cache as well.  By defining an object `perCache` in options you can supply any known information to avoid repeat calls to the db.  If a any requested key is found in `preCache` it is simply returned, otherwise the regular caching mechanism applies.   The objects in `preCache` need to adhere to the `cache-stampede` storage specification, i.e. the data should be under property `data`.

#### Where do errors go?
The default behaviour is to **not** cache errors. However, if any error object has a property `cache` set to `true`, then `cache-stampede` will save that error to cache and return it as rejected promise when it's requested again.  This can be very handy when you know an error represent an irrevocable state for a particular key.

