var parseargs = require('minimist');
var couchreq = require('request');
var through2 = require('through2');
var Parser = require('jsonparse');
var pkg = require('../package.json');

exports.couchdbdump = function(){
  var args = parseargs(process.argv.slice(2), {
    default: {
      "P": "5984",
      "h": "localhost",
      "s": 0,
      "r": "http"
    }
  });
  if(args.version){
    console.log('v' + pkg.version);
    return;
  }
  if(args.help || !args.h || !args.P || !args.d){
    console.error("usage: cdbdump [-u username] [-p password] [-h host] [-P port] [-r protocol] [-s json-stringify-space] [-k dont-strip-revs] [-D design doc] [-v view] -d database");
    return;
  }

  //setup data stream, parsing ...
  var skip = true;
  var p = new Parser();
  var ts = through2(function write(chunk, enc, callback){
    p.write(chunk);
    callback();
  }, function(callback){
    this.push(']}\n');
    callback();
  });

  p.onValue = function (value) {
    if (this.stack.length === 3 && this.key === 'doc'){
      if(!skip){
        ts.push(',');
      } else {
        skip = false;
      }
      if(!args.k){
        delete value._rev;
      }
      ts.push(JSON.stringify(value, null, args.s));
    }
  };


  //start data stream from couch
  process.stdout.write('{"docs": [ ');

  var auth = "";
  if(args.u){
    auth = args.u + ":";
  }
  if(args.p){
    auth = auth + args.p;
  }
  if(auth){
    auth = auth + "@";
  }

  var couchurl = args.r + '://' + auth + args.h + ':' + args.P + '/' + args.d + '/_all_docs';
  if(args.D && args.v){
    couchurl = args.r + '://' + auth + args.h + ':' + args.P + '/' + args.d + '/_design/' + args.D + '/_view/' + args.v;
  }

  couchreq({
    method: "GET",
    url: couchurl,
    qs: {
      "include_docs": "true"
    },
    headers: {
      "Accept": "application/json"
    }
  })
  .on('error', function(err){
    console.error(err);
  })
  .on('response', function(res){
    console.error("CouchDB response code: " + res.statusCode);
    console.error("CouchDB response message: " + res.statusMessage);
  })
  .pipe(ts)
  .pipe(process.stdout);
};
