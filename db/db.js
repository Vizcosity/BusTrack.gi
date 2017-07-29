/**
 *  INTERFACE FOR bustrack DATABASE.
 */

const { Pool } = require("pg");

const connectionDetails = {
  host: 'localhost',
  port: '5432',
  database: 'bustrack'
};

const pool = new Pool(connectionDetails);

module.exports = {

  query: function(statement, callback){

    connectToPool(pool, (err, client, done) => {

      if (callback)
        client.query(statement, (err, data) => {

          if (err) {
            done();
            log("Error executing query: " + statement);
            console.log(err);
          }

          return callback(err, data);

        });
      else client.query(statement);


    });

  }

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
    } else log("DB connection successful.");

    if (callback) callback(err, client, done);

  });

}
