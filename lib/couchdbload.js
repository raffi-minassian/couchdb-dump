var parseargs = require('minimist');
var couchreq = require('request');
var pkg = require('../package.json');

exports.couchdbload = function(){
  var args = parseargs(process.argv.slice(2), {
    default: {
      "P": "5984",
      "h": "localhost",
      "r": "http"
    }
  });
  if(args.version){
    console.log('v' + pkg.version);
    return;
  }
  if(args.help || !args.h || !args.P || !args.d){
    console.log("usage: cdbload [-u username] [-p password] [-h host] [-P port] [-r protocol] [-v verbose] -d database");
    return;
  }

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

  process.stdin.pipe(couchreq({
    method: "POST",
    url: args.r + "://" + auth + args.h + ":" + args.P + "/" + args.d + "/_bulk_docs",
    headers: {
      "Accept": "application/json",
      "Content-type": "application/json"
    }
  }, function(err, res, body){
    if(err){
      return console.log(err);
    }
    console.log("CouchDB response code: " + res.statusCode);
    console.log("CouchDB response message: " + res.statusMessage);
    if(args.v){
      console.log(JSON.stringify(body, null, 2));
    }
  }));

};
