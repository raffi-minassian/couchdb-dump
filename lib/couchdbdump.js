var parseargs = require('minimist');
var couchreq = require('request');
var through = require('through');
var Parser = require('jsonparse');

exports.couchdbdump = function(){
  var args = parseargs(process.argv.slice(2), {
    default: {
      "P": "5984",
      "h": "localhost",
      "s": 0,
      "r": "http"
    }
  });
  if(args.help || !args.h || !args.P || !args.d){
    console.error("usage: cdbdump [-u username] [-p password] [-h host] [-P port] [-r protocol] [-s json-stringify-space] [-k dont-strip-revs] -d database");
    return;
  }

  process.stdout.write('{"docs": [ ');

  var skip = true;
  var p = new Parser();
  p.onValue = function (value) {
    if (this.stack.length === 3 && this.key === 'doc'){
      if(!skip){
        process.stdout.write(",");
      } else {
        skip = false;
      }
      if(!args.k){
        delete value._rev;
      }
      process.stdout.write(JSON.stringify(value, null, args.s));
    }
  };

  var ts = through(function write(data){
    p.write(data);
  }, function end(){
    process.stdout.write(']}\n');
  });

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

  couchreq({
    method: "GET",
    url: args.r + "://" + auth + args.h + ":" + args.P + "/" + args.d + "/_all_docs",
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
  .pipe(ts);

};
