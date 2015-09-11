var parseargs = require('minimist');
var couchreq = require('request');

exports.couchdbload = function(){
  var args = parseargs(process.argv.slice(2), {
    default: {
      "P": "5984",
      "h": "localhost",
      "r": "http"
    }
  });
  if(args.help || !args.h || !args.P || !args.d){
    console.log("usage: couchdbdump [-h host] [-P port] [-r protocol] -d database");
    return;
  }

  process.stdin.pipe(couchreq({
    method: "POST",
    url: args.r + "://" + args.h + ":" + args.P + "/" + args.d + "/_bulk_docs",
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

}
