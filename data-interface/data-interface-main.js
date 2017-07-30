/**
 *  MAIN INTERFACE MODULE.
 *
 *  This module liases between the back-end and the front-end, providing a layer
 *  of abstraction between the two.
 */

function dataInterfaceMain(dbName){

  // Set the default DBName to live if not specified.
  // Perhaps useful for interaction with analysis later on.
  if (!dbName) dbName = 'live';

  // First we set up a connection to the DB!
  const DB = require("../db/db.js");
  const db = new DB();

  // Returns all the buses.
  this.getAllBuses = function(cb){
    db.query("SELECT * FROM "+dbName, (err, data) =>  {
      if (err) log("Failed to get all buses: " + err);
      if (!cb) return log("No callback found for 'getAllBuses' call.");
      return cb(data.rows);
    });
  }

  // Returns all the buses currently at a given stop.
  this.getBusesAtStop = function(stopID, cb){
    db.query("SELECT * FROM "+dbName+" WHERE stopID='"+stopID+"'", (err, data) =>  {
      if (err) log("Failed to get buses at stop ['"+stopID+"']: " + err);
      if (!cb) return log("No callback found for 'getBusesAtStop' call.");
      return cb(data.rows);
    });
  }

  // Returns all buses currently at stop AND approaching the stop.
  this.getBusesApproachingStop = function(stopID){
    /**
     * This one requires a bit of processing,
     * will leave to later.
     */
  }

  // Returns all the buses and their locations on the routeID specified.
  this.getBusesOnRouteID = function(routeID){
    db.query("SELECT * FROM "+dbName+" WHERE routeID="+routeID, (err, data) =>  {
      if (err) log("Failed to get buses on routeID ["+routeID+"]: " + err);
      if (!cb) return log("No callback found for 'getBusesOnRouteID' call.");
      return cb(data.rows);
    });
  }

  // Returns all the buses that are currently waiting at a stop.
  this.getWaitingBuses = function(cb){
    db.query("SELECT * FROM "+dbName+" WHERE atStop=true", (err, data) =>  {
      if (err) log("Failed to get waiting buses: " + err);
      if (!cb) return log("No callback found for 'getWaitingBuses' call.");
      return cb(data.rows);
    });
  }

}

module.exports = dataInterfaceMain;


// UTIL.
function log(msg){
  console.log("[DATA-INTERFACE-MAIN.js] " + msg);
}
