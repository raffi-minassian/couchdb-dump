couchdb-dump
========

A command line tool that outputs all documents in a [CouchDB](http://couchdb.apache.org) database. Also included is a command line tool that takes that output as input and loads it back into a CouchDB database.

Reading and writing the data is done via stdin and stdout, respectively. The output of `cdbdump` is a JSON document containing a "docs" array element which contains every document in the database. The `cdbload` command takes an input which is exactly the same as the output of `cdbdump` and writes every document in it into the target database.

Internally this is just calling on CouchDB's [**_all_docs**](http://docs.couchdb.org/en/1.6.1/api/database/bulk-api.html#) and [**_bulk_docs**](http://docs.couchdb.org/en/1.6.1/api/database/bulk-api.html#post--db-_bulk_docs) endpoints. To do what it does, this package just glues together the power of Node.js streams and the following modules...

- [request](https://github.com/request/request)
- [through](https://github.com/dominictarr/through)
- [jsonparse](https://github.com/creationix/jsonparse)
- [minimist](https://github.com/substack/minimist)

Many thanks to the authors of those amazing packages for making this possible.

## Installation

`npm install couchdb-dump -g`

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


## `cdbdump` Full Usage

If you execute the `cdbdump` command with no arguments or with --help, the following usage information will be printed on the console and the command will exit.

`usage: cdbdump [-u username] [-p password] [-h host] [-P port] [-r protocol] [-s json-stringify-space] [-k dont-strip-revs] [-D design doc] [-v view] -d database`

The username and password, if supplied, will be used for authentication via [Basic Auth (RFC2617)](http://docs.couchdb.org/en/1.6.1/api/server/authn.html#api-auth-basic). Currently this is the only supported authentication method.

If you want to constrain the documents exported to only those that belong to a [CouchDB View](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html), you can pass the **-D** and **-v** options to specify the design document and view function name respectively. This wont work with view that reduce or do other fancy things.

The **-s** paramater for `cdbdump` is used as the third paramater to JSON.stringify() for the amount of white space to use if you want the output to be pretty-printed.

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

## Why Another CouchDB Dump Command?
I wrote this because I couldn't find a cli dump tool for CouchDB that allowed me to pipe output directly. Since then I also found these other excellent options which you should definitely check out as well:

- [danielebailo/couchdb-dump](https://github.com/danielebailo/couchdb-dump)
- [pouchdb-dump-cli](https://www.npmjs.com/package/pouchdb-dump-cli)
- [pouchdb-load](https://www.npmjs.com/package/pouchdb-load)


## Testing

I had to get this going quick and dirty at the moment so there are no automated tests in place yet.

## Contributing

Fork and PR. Thanks!!

## Release History

* 1.2.0 Support for dumping only docs which belong to a specified CouchDB design doc and view.
* 1.1.0 Added Authentication options
* 1.0.0 Initial release
