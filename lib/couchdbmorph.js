var parseargs = require('minimist');
var couchreq = require('request');
var through2 = require('through2');
var Parser = require('jsonparse');
var path = require('path');
var pkg = require('../package.json');

exports.couchdbmorph = function(){
  var args = parseargs(process.argv.slice(2), {
    default: {
      "s": 0,
    }
  });
  if(args.version){
    console.log('v' + pkg.version);
    return;
  }
  if(args.help || !args.f){
    console.error("usage: cdbmorph [-s json-stringify-space] -f path-to-morphfunction.js");
    return;
  }

  var morphfunction = require(path.resolve(process.cwd(), args.f));
  var skip = true;
  var p = new Parser();

  var ts = through2.obj(function (chunk, enc, callback){
    p.write(chunk);
    callback();
  })
  .on('data', function (data) {
    morphts.write(JSON.stringify(data));
  })
  .on('end', function () {
    morphts.end();
  });

  var morphts = through2(function (chunk, enc, callback){
    var doc = JSON.parse(chunk);
    morphfunction(doc, function(err, morphed){
      if(!morphed){
        return callback();
      }
      if(!skip){
        morphts.push(',');
      } else {
        skip = false;
      }
      if(err){
        console.error(err);
        morphts.push(JSON.stringify(chunk, null, args.s));
        return callback();
      }
      morphts.push(JSON.stringify(morphed, null, args.s));
      callback();
    });
  }, function(callback){
    this.push(']}\n');
    callback();
  });

  p.onValue = function (value) {
    if(this.stack.length === 2){
      ts.push(value);
    }
  };

  process.stdout.write('{"docs": [ ');
  process.stdin.pipe(ts);
  morphts.pipe(process.stdout);
};
