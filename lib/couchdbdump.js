const fs = require('fs');
const queue = require('async/queue');
const requestPromise = require('request-promise');
const async = require('async');
const mkdirp = require('mkdirp');

const pkg = require('../package.json');
const util = require('./utils');

exports.couchdbdump = function() {
  const conf = util.buildConf();
  
  if(conf.version) {
    console.log('v' + pkg.version);
    return;
  }

  if(conf.help || !conf.couchdb.host || !conf.couchdb.port || (!conf.database && !conf.allDatabases)) {
    console.error("usage: cdbdump [-u username] [-p password] [-h host] [-P port] [-r protocol] [-s json-stringify-space] [-k dont-strip-revs] [-D design doc] [-v view] [-d database|-a all-databases] [--concurency] [-o output-directory]");
    return;
  }

  let output = process.stdout;
  if(conf.output) {
    mkdirp.sync(conf.output);
  }

  if(conf.allDatabases) {
    const q = async.queue(function(task, cb) {
      dump(task.conf, task.db, task.output, 0, cb);
    }, conf.concurrency);
  
    requestPromise(conf.couchdb.url + '_all_dbs')
    .then(function(data) {
      dbs = JSON.parse(data);
      dbs.map((db)  => {
        if(conf.output) {
          mkdirp.sync(conf.output);
          output = fs.createWriteStream(conf.output + '/' + db + '.json');
        }
        q.push({db: db, conf: conf, output: output});
      });
    })
    .catch(function(err) {
      console.error(err);
    });
    return;
  }

  output = fs.createWriteStream(conf.output + '/' + conf.database + '.json');
  dump(conf, conf.database, output);
};

function dump(options, database, output, offset = 0, cb = () => {}) {
  let request = {
    qs: {
      include_docs: "true",
      attachments: "true",
      limit: options.numberPerPage,
      skip: offset
    },
    headers: {
      "Accept": "application/json"
    }
  }
  request.url = options.couchdb.url + database;
  if(options.designDoc && options.views) {
    request.url += '/_design/' + options.designDoc + '/_view/' + options.views;
  } else {
    request.url += '/_all_docs';
  }

  if(offset == 0) {
    output.write('{"docs": [ ');
  }

  requestPromise
    .get(request)
    .then(function(data) {
      const docs = JSON.parse(data);
      if(docs.rows.length > 0) {
        docs.rows.map((row) => {output.write(JSON.stringify(row));});
        if(docs.rows.length == options.numberPerPage) {
          dump(options, database, output, (offset+options.numberPerPage), cb)
        } else {
          output.write(']}\n');
          cb();
        }
      } else {
        output.write(']}\n');
        cb();
      }
    })
    .catch(function(err) {
      console.error(err);
    });
}

