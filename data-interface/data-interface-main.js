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

  // Require moment module which will help with dealing with dates.
  const moment = require('moment');

  // Require model dependencies for returning JSON data.
  const Stop = require("../data/models/stop.js");

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
  this.getBusesOnRoute = function(routeID, cb){
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

  // Returns subset of logs which have all logs recorded today.
  this.getBusesLoggedToday = function(cb){
    var startOfToday = moment().startOf('day').format();
    var endOfToday = moment().endOf('day').format();
    this.getBusesLoggedBetween(startOfToday, endOfToday, (data) => {
      return cb(data);
    });
  }

  // Returns subset of logs recorded this week.
  this.getBusesLoggedThisWeek = function(cb){
    var startOfWeek = moment().startOf('week').format();
    var endOfWeek = moment().endOf('week').format();
    this.getBusesLoggedBetween(startOfWeek, endOfWeek, (data) => {
      return cb(data);
    });
  }

  // Returns subset of logs recorded at a specified timeframe.
  this.getBusesLoggedBetween = function(date1, date2, cb){
    checkDB(dbName);
    db.query("SELECT * FROM stoplog WHERE logdate BETWEEN '"+date1+"' AND '"+date2+"'", (err, data) => {
      if (err) log("Failed to get buses logged between dates: ["+date1+"] and ["+date2+"]: " + err);
      if (!cb) return log("No callback found for 'getBusesLoggedBetween' call.");
      return cb(data.rows);
    });
  }

  // Returns all routeIDs which support the passed stopID.
  this.getRoutesWhichSupportStop = function(stopID, cb){
    checkDB(dbName);
    db.query("SELECT DISTINCT routeID FROM stoplog where stopID='"+stopID+"'", (err, data) => {
      if (err) log("Failed to get supported routes for stopID ["+stopID+"]: " + err);
      if (!cb) return log("No callback found for 'getRoutesWhichSupportStopID' call.");
      return cb(data.rows);
    });
  }

  // Returns all stopIDs which are supported by a given routeID.
  this.getStopsSupportedByRoute = function(routeID, cb){
    checkDB(dbName);
    db.query("SELECT DISTINCT stopID FROM stoplog where routeID="+routeID, (err, data) => {
      if (err) log("Failed to get supported routes for routeID ["+routeID+"]: " + err);
      if (!cb) return log("No callback found for 'getStopsSupportedByRoute' call.");

      if (data.rows && data.rows[0] && data.rows[0].stopid){

        // Prepare all the Stop objects for being returned as an array.
        var output = [];
        for (var i = 0; i < data.rows.length; i++){
          output.push(new Stop(data.rows[i].stopid));
        }

        return cb(output);
      }

      return cb(data.rows);
    });
  }

}

module.exports = dataInterfaceMain;


// UTIL.
function log(msg){
  console.log("[DATA-INTERFACE-MAIN.js] " + msg);
}

function checkDB(dbName){
  if (dbName !== "stoplog")
    return
      log(`[WARN] Current data interface is configured with 'live'.
            Current request uses 'stoplog' table. Please use correct INTERFACE.`);
}
