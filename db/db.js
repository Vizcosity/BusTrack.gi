/**
 *  INTERFACE / wrapper FOR bustrack DATABASE.
 */
function db() {
const { Pool } = require("pg");

const connectionDetails = {
  host: 'localhost',
  port: '5432',
  database: 'bustrack'
};

const pool = new Pool(connectionDetails);

var connection = {};

connectToPool(pool, (err, client, done) => {
  connection.err = err;
  connection.client = client;
  connection.done = done;
});

  this.query = function(statement, callback){

    checkPool(pool, (connection) => {

      if (callback)
        connection.client.query(statement, (err, data) => {

          if (err) {
            connection.done();
            log("Error executing query: " + statement);
            console.log(err);
          }

          return callback(err, data);

        });

      else connection.client.query(statement);

    });

  }



// Utiltiy functions.
function log(msg){
  console.log("[DB.js] " + msg);
}

function connectToPool(pool, callback){

  pool.connect((err, client, done) => {

    if (err){
      done();
      log("DB failed to set up connection to pool.");
      console.log(err);
    }

    if (callback) callback(err, client, done);

  });

}

// Check to see if pool connection is established, if not, then
// connect and return the details in a cb.
function checkPool(pool, cb){

  if (!connection.client){
    connectToPool(pool, (err, client, done) => {
      connection.err = err;
      connection.client = client;
      connection.done = done;
      if (cb) return cb(connection);
    });
  } else return cb(connection);

}

}

module.exports = db;
