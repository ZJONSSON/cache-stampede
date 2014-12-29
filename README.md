# cache-stampede
Most caching libraries do not place a variable into cache until its value has been resolved.  When multiple requests for the same key arrive at the same time, all of them will work on resolving the cached key (instead of only the first one) and then each of them will try to update the cache when resolved (i.e. [cache stampede](http://en.wikipedia.org/wiki/Cache_stampede)).   

In `cache-stampede`, the first request to see an empty cache results for a particular key will immediately register the key in the cache as `{__caching__ : true }` and move on the resolve the results.  When the variable has been resolved the cache is updated with the results.  Any subsequent request that see the variable as  `{__caching__ : true} ` will wait for  `retryDelay ` milliseconds and then try polling the cache again (until `maxRetries` have been made).

## Initialization
Two basic database adapters are provided.
* `require('cache-stampede').mongo(mongo_collection_object,[options])`
* `require('cache-stampede').redis(redis_client,[options])`

Optional options as the second arguments.   The available options are `maxRetries` and `retryDelay` and `expiry`  (in ms).  They are applied as default options to any request that doesn't explicitly specify them.

The library can also be initialized with a custom adapter that provides `get`, `insert`, `update` and `remove` functions which return Promise A+ compliant promises.  The `insert` method should return `KEY_EXISTS` error if a key already exists in the datastore and the `get` method should return `null` or `undefined` if a key was not found.

## Methods

### `stampede.cached(key,fn,[options])`
This function either returns a cached value for the supplied key or attempts to resolve the value and update the cache, returning a promise on the results.  If an `info` property is defined in the options, it will be stored (and available) immediately.

### `stampede.get(key,[options],[retry])`
Retrieve the supplied key from the cache. If the variable is __caching__ the function will retry until `maxRetries` is reached.  The resulting promise will either be resolved with the cached value or errored with the message `MAX_RETRIES`.  The retry parameter is internally used to keep track of how many retries have been made (if any).  If `expiry` was defined when the key was defined and it has expired, the key will be deleted and `KEY_NOT_FOUND` error thrown.

### `stampede.set(key,fn,[options])`
Set the supplied key as the result of the supplied function and return a promise.  The function can either return a value or a promise.  If `fn` is not a function, the cache will be set to the value of this argument.  If the key already exists in the cache, the promise will return a `E11000` error, otherwise the resolved value will be returned. If an `info` property is defined in the options, it will be stored (and available) immediately. If option upsert is true this function will overwrite any current value.

### `stampede.info(key)`
Returns the `info` for the supplied key if this key is either caching or finished running.

