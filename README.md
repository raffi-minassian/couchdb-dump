couchdb-dump
========

A set of three command line tools that perform the following functions. One outputs all documents (including any attachments) in a [CouchDB](http://couchdb.apache.org) database, one lets you provide a function that can modify the documents in that output, and one takes that output as input and loads it back into a CouchDB database.

Reading and writing the data is done via stdin and stdout, respectively. The output of `cdbdump` is a JSON document containing a "docs" array element which contains every document in the database. The `cdbmorph` command takes the output of `cdbdump` and allows you to modify the documents in it by passing each of them through a function that you supply. The `cdbload` command takes an input which is exactly the same as the output of `cdbdump` or `cdbmorph` and writes every document in it into the target database.

Internally, cdbdump and cdbload just calling on CouchDB's [**_all_docs**](http://docs.couchdb.org/en/1.6.1/api/database/bulk-api.html#) and [**_bulk_docs**](http://docs.couchdb.org/en/1.6.1/api/database/bulk-api.html#post--db-_bulk_docs) endpoints. To do what it does, this package uses the power of Node.js streams with the help of the following modules...

- [request](https://github.com/request/request)
- [through2](https://github.com/rvagg/through2)
- [jsonparse](https://github.com/creationix/jsonparse)
- [minimist](https://github.com/substack/minimist)

Many thanks to the authors of those amazing packages for making this possible.

## Installation

`npm install -g couchdb-dump`

## Usage Examples

The following will dump the contents of a CouchDB database called *myhugedatabase* running on port 5984 on localhost. The output is written to a file called *myhugedatabase.json*.

`cdbdump -d myhugedatabase > myhugedatabase.json`

If you are doing this for archiving purposes you could do something cool like this to extract and gzip it in one step ...

`cdbdump -d myhugedatabase | gzip > myhugedatabase.json.gz`

Both of the following command examples will load all the documents in the *myhugedatabase.json* file into a CouchDB database called *myhugeduplicate*.

`cdbload -d myhugeduplicate < myhugedatabase.json`<br>
 **OR**<br>
`cat myhugedatabase.json | cdbload -d myhugeduplicate`

You can even do this ...

`cdbdump -d myhugedatabase | cdbload -d myhugeduplicate`

... which streams all the docs from one CouchDB database into a second one. While this works well, you should probably take a look at using [CouchDB's awesome built-in replication features](http://guide.couchdb.org/draft/replication.html) instead.

But suppose you need to manipulate the documents in the `cdbdump` output before you load them into CouchDB with `cdbload`. You can do that with the included `cdbmorph` command.

Lets assume you need to add a new key and value to all documents which meet certain criteria, and you need to delete documents which meet some other criteria. So you write a function as follows and save it in a file called *morph.js*. For example:

    module.exports = function(doc, cb){
      if(doc.somekey && doc.somekey === 'somevalue'){
        doc.anotherkey = 'anothervalue';
      }
      if(doc.someotherkey && doc.someotherkey === 'someothervalue'){
        doc._deleted = true;
      }
      cb(null, doc);
    }

Now you can run the documents in the *myhugedatabase.json* file from the example above through this function and feed the output into a file or directly back into a CouchDB database as follows ...

`cat myhugedatabase.json | cdbmorph -f ./morph.js | cdbload -d myhugemodified`

You can also pipe output directly from `cdbdump` to `cdbmorph` to `cdbload` like this ...

`cdbdump -d myhugedatabase | cdbmorph -f ./morph.js | cdbload -d myhugemodified`

You can even put modified documents back into a CouchDB database by loading the stream of changed documents back into the source database, simulating the feel of in-place-updates, like this ...

`cdbdump -k -d myhugedatabase | cdbmorph -f ./morph.js | cdbload -d myhugedatabase`

*NOTE: This is not magic and it is not "real" in-place-updates so all the rules of CouchDB document updates with respect to* **_rev** *values, etc, still apply. Be mindful of this and other activity on the database if you do something like this. Also, be sure to apply the* **-k** *flag on the `cdbdump` command so that the documents in the output will include their* **_rev** *values.*


## `cdbdump` Full Usage

If you execute the `cdbdump` command with no arguments or with --help, the following usage information will be printed on the console and the command will exit.

`usage: cdbdump [-u username] [-p password] [-h host] [-P port] [-r protocol] [-s json-stringify-space] [-k dont-strip-revs] [-D design doc] [-v view] -d database`

The username and password, if supplied, will be used for authentication via [Basic Auth (RFC2617)](http://docs.couchdb.org/en/1.6.1/api/server/authn.html#api-auth-basic). Currently this is the only supported authentication method.

If you want to constrain the documents exported to only those that belong to a [CouchDB View](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html), you can pass the **-D** and **-v** options to specify the design document and view function name respectively. This won't work with views that *reduce* or do other fancy things.

The **-s** parameter for `cdbdump` is used as the third parameter to JSON.stringify() for the amount of white space to use if you want the output to be pretty-printed.

##### CouchDB revision fields
By default, the `_rev` element of every document is stripped out of the output of `cdbdump`. This allows the list of documents to be used as input to `cdbload`. If the **-k** parameter is given to `cdbdump`, then the `_rev` elements will *not* be stripped out and this will cause CouchDB to be unable to easily load these documents through the `_bulk_docs` endpoint because every document will error with a mismatched revision message (assuming you are loading into an empty database). See [CouchDB _bulk_docs documentation](http://docs.couchdb.org/en/1.6.1/api/database/bulk-api.html#post--db-_bulk_docs) for more details and ways you can manipulate the `cdbdump` output to get around that in case you need to keep the `_rev` values in your dump.

#### Default options for cdbdump

    host = localhost
    port = 5984
    protocol = http
    json-stringify-space = 0
    dont-strip-revs = false

## `cdbload` Full Usage

If you execute the `cdbload` command with no arguments or with --help, the following usage information will be printed on the console and the command will exit.

`usage: cdbload [-u username] [-p password] [-h host] [-P port] [-r protocol] [-v verbose] -d database`

The **-v** parameter for `cdbload` will print CouchDB's response body to the console. That will be an array with one JSON result object for every object loaded in!!

#### Default options for cdbload

    host = localhost
    port = 5984
    protocol = http
    verbose = false

## `cdbmorph` Full Usage

If you execute the `cdbmorph` command with no arguments or with --help, the following usage information will be printed on the console and the command will exit.

`usage: cdbmorph [-s json-stringify-space] -f path-to-morphfunction.js`

The **-f** parameter is used to provide the path to the file containing the javascript function that will be applied to every document in the stream. The path can be an absolute path:

`cat dump.json | cdbmorph -f ~/morph.js`

... or a relative path to the file from current working directory that the `cdbmorph` command will be run from:

`cat dump.json | cdbmorph -f ../../../morph.js`

The file containing the morph function will be *required* into the script as follows:

`var morphfunction = require(path.resolve(process.cwd(), path-to-morphfunction.js));`

The morph function takes two arguments which are a CouchDB document and a callback.

#### function(doc, callback)

###### Arguments

+ `doc` - A CouchDB document (json).
+ `callback(err, doc)` - A callback function used to return the morphed document or an error. If an error is returned the unchanged document is included in the output stream and the error is printed on error.console. Returning `null` as the *doc* argument causes the original document to be excluded from the output.

###### Example

    module.exports = function(doc, cb){
      if(doc.dontmod){
        return cb(null, doc); //unmodified doc is passed through to the output
      }
      if(doc.theexclusionkey){
        return cb(); //doc will not be in the output
      }
      if(doc.somekey && doc.somekey === 'somevalue'){
        doc.anotherkey = 'anothervalue'; //doc is modified in the output
      }
      if(doc.someotherkey && doc.someotherkey === 'someothervalue'){
        doc._deleted = true; //doc is a 'CouchDB deleted document' in the output
      }
      cb(null, doc);
    }

The **-s** parameter for `cdbmorph` is used as the third parameter to JSON.stringify() for the amount of white space to use if you want the output to be pretty-printed.

#### Batch document modifications on a CouchDB database using `cdbmorph`

As shown in the usage examples above, it is possible to pass the documents in a CouchDB database through `cdbmorph` for modification as follows:

`cdbdump -k -d dbname | cdbmorph -f ./morph.js | cdbload -d dbanme`

To make this work you must be sure to apply the **-k** flag on the `cdbdump` command so that the documents in the output will include their **_rev** values. By default those would be stripped out which is only appropriate if you are loading the documents into a database where they don't already exist.

Be mindful of all the normal rules of CouchDB document updates with respect to **_rev** values, etc when performing this kind of operation.

#### Default options for cdbmorph

    json-stringify-space = 0

## Why Another CouchDB Dump Command?
I originally wrote this because I couldn't find a cli dump tool for CouchDB that allowed me to pipe output directly. Since then I also found these other excellent options which you should definitely check out as well:

- [danielebailo/couchdb-dump](https://github.com/danielebailo/couchdb-dump)
- [pouchdb-dump-cli](https://www.npmjs.com/package/pouchdb-dump-cli)
- [pouchdb-load](https://www.npmjs.com/package/pouchdb-load)

With the addition of the `cdbmorph` command in release 2.2.0, this tool is now more than just a CouchDB dump command. It also provides convenient batch document manipulation features on the command line.

## Testing

Still no automated tests in place. :\

## Contributing

Fork and PR. Thanks!!

## Release History

* 2.2.1 Minor cleanup.
* 2.2.0 Provides the `cdbmorph` command that lets you manipulate the documents in the stream between `cdbdump` and `cdbload` using a function you provide.
* 2.1.0 Includes attachments as part of the dump. (Contributed by https://github.com/iddo)
* 2.0.0 Using latest through2 package instead of through.
* 1.2.0 Support for dumping only docs which belong to a specified CouchDB design doc and view.
* 1.1.0 Added Authentication options
* 1.0.0 Initial release
