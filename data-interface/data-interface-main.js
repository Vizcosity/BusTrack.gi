/**
 *  MAIN INTERFACE MODULE.
 *
 *  This module liases between the back-end and the front-end, providing a layer
 *  of abstraction between the two.
 */

function dataInterfaceMain(dbName){

  // Set the default DBName to live if not specified.
  // Perhaps useful for interaction with analysis later on.
  if (!dbName) dbName = 'buses.live';

  // First we set up a connection to the DB!
  const DB = require("../db/db.js");
  const db = new DB();

  // Require moment module which will help with dealing with dates.
  const moment = require('moment');

  // Require model dependencies for returning JSON data.
  const Stop = require("../data/models/stop.js");

  // Returns all the buses.
  this.getAllBuses = function(cb){
    db.query(`
      SELECT
        b.id,
        b."pingDate",
        b."pageDate",
        b."scrapeDate",
        r."name" as "route",
        s."name" as "stopName",
        s."abbreviation" as "stopAbbreviation",
        b."isAtStop",
        b."scrapeInterval"
        FROM ${dbName} b
        JOIN buses.stop_info s
        ON b."stopID"=s.id
        JOIN buses.route_info r
        ON b."routeID" = r.id;
    `, (err, data) =>  {
          if (err) log("Failed to get all buses: " + err);
          if (!cb) return log("No callback found for 'getAllBuses' call.");
          return cb(data.rows);
        });
      };

  // Returns all the buses currently at a given stop.
  this.getBusesAtStop = function(stop, cb){

    // If property type is not specifed, assume that the stop abbreviation has been
    // passed.
    stop = parseStopArg(stop);

    db.query(`
      SELECT
        b.id,
        b."pingDate",
        b."pageDate",
        b."scrapeDate",
        r."name" as "route",
        s."name" as "stopName",
        s."abbreviation" as "stopAbbreviation",
        b."isAtStop",
        b."scrapeInterval"
        FROM ${dbName} b
        JOIN buses.stop_info s
        ON b."stopID"=s.id
        JOIN buses.route_info r
        ON b."routeID" = r.id
        WHERE b."stopID"=
          (SELECT id FROM buses.stop_info WHERE "${stop.property}"='${stop.value}');
      `, (err, data) =>  {
      if (err) log(`Failed to get buses at ${stop.property}: ${stop.value}: ${err}`);
      if (!cb) return log("No callback found for 'getBusesAtStop' call.");
      return cb(data.rows);
    });
  };

  // Returns all buses currently at stop AND approaching the stop.
  this.getBusesApproachingStop = function(stopID){
    /**
     * This one requires a bit of processing,
     * will leave to later.
     */
  };

  // Returns all the buses and their locations on the routeID specified.
  this.getBusesOnRoute = function(route, cb){

    // If property type is not specifed, assume that the route name has been
    // passed.
    route = parseRouteArg(route);

    db.query(`
      SELECT
        b.id,
        b."pingDate",
        b."pageDate",
        b."scrapeDate",
        r."name" as "route",
        s."name" as "stopName",
        s."abbreviation" as "stopAbbreviation",
        b."isAtStop",
        b."scrapeInterval"
        FROM ${dbName} b
        JOIN buses.stop_info s
        ON b."stopID"=s.id
        JOIN buses.route_info r
        ON b."routeID" = r.id
        WHERE b."routeID"=
          (SELECT id FROM buses.route_info WHERE "${route.property}"='${route.value}');
      `, (err, data) =>  {
      if (err) log(`Failed to get buses on route.${route.property}: ${route.value}: ${err}`);
      if (!cb) return log("No callback found for 'getBusesOnRouteID' call.");
      return cb(data.rows);
    });
  };

  // Returns all the buses that are currently waiting at a stop.
  this.getWaitingBuses = function(cb){
    db.query(`
      SELECT
        b.id,
        b."pingDate",
        b."pageDate",
        b."scrapeDate",
        r."name" as "route",
        s."name" as "stopName",
        s."abbreviation" as "stopAbbreviation",
        b."isAtStop",
        b."scrapeInterval"
        FROM ${dbName} b
        JOIN buses.stop_info s
        ON b."stopID"=s.id
        JOIN buses.route_info r
        ON b."routeID" = r.id
        WHERE b."isAtStop"=true;
      `, (err, data) =>  {
      if (err) log("Failed to get waiting buses: " + err);
      if (!cb) return log("No callback found for 'getWaitingBuses' call.");
      return cb(data.rows);
    });
  };

  // Returns subset of logs which have been recorded this hour.
  this.getBusesLoggedWithinThisHour = function(cb){

    var startOfHour = moment().startOf('hour').format();
    var endOfHour = moment().endOf('hour').format();
    this.getBusesLoggedBetween(startOfHour, endOfHour, (data) => {
      return cb(data);
    });

  }

  // Returns subset of logs which have all logs recorded today.
  this.getBusesLoggedToday = function(cb){
    var startOfToday = moment().startOf('day').format();
    var endOfToday = moment().endOf('day').format();
    this.getBusesLoggedBetween(startOfToday, endOfToday, (data) => {
      return cb(data);
    });
  };

  // Returns subset of logs recorded this week.
  this.getBusesLoggedThisWeek = function(cb){
    var startOfWeek = moment().startOf('week').format();
    var endOfWeek = moment().endOf('week').format();
    this.getBusesLoggedBetween(startOfWeek, endOfWeek, (data) => {
      return cb(data);
    });
  };

  // Returns subset of logs recorded at a specified timeframe.
  this.getBusesLoggedBetween = function(date1, date2, cb){

    // Check DB since this query designed for the buses.log table.
    checkDB(dbName);

    db.query(`
      SELECT
      b.id,
      b."pingDate",
      b."pageDate",
      b."scrapeDate",
      r."name" as "route",
      s."name" as "stopName",
      s."abbreviation" as "stopAbbreviation",
      b."isAtStop",
      b."scrapeInterval"
      FROM ${dbName} b
      JOIN buses.stop_info s
      ON b."stopID"=s.id
      JOIN buses.route_info r
      ON b."routeID" = r.id
      WHERE "pingDate" BETWEEN '${date1}' AND '${date2}';
      `, (err, data) => {
      if (err) log("Failed to get buses logged between dates: ["+date1+"] and ["+date2+"]: " + err);
      if (!cb) return log("No callback found for 'getBusesLoggedBetween' call.");
      return cb(data.rows);
    });

  };

  // Returns all routeIDs which support the passed stopID.
  this.getRoutesWhichSupportStop = function(stop, cb){

    // NOTE: Use full stop name where possible, as abbreviations sometime
    // have the same value for more than one stop and may break query.
    // Use abbreviation if speified object is not passed:
    stop = parseStopArg(stop);

    db.query(`
      SELECT DISTINCT r."name" AS "route", b."routeID" AS "routeID"
      FROM buses.log b
      JOIN buses.route_info r
      ON b."routeID" = r.id
      WHERE b."stopID" = (SELECT id FROM buses.stop_info WHERE ${stop.property}='${stop.value}');
      `, (err, data) => {
      if (err) log("Failed to get supported routes for stopID ["+stopID+"]: " + err);
      if (!cb) return log("No callback found for 'getRoutesWhichSupportStopID' call.");
      return cb(data.rows);
    });
  };

  // Returns all stopIDs which are supported by a given routeID.
  this.getStopsSupportedByRoute = function(routeID, cb){

    db.query(`
      SELECT DISTINCT s."name" AS "stopName", s."abbreviation" as "stopAbbreviation", b."stopID" AS "stopID"
      FROM buses.log b
      JOIN buses.stop_info s
      ON b."stopID" = s.id
      WHERE b."routeID" = (SELECT id FROM buses.route_info WHERE name='${routeID}');
      `, (err, data) => {

      if (err) log("Failed to get supported routes for routeID ["+routeID+"]: " + err);
      if (!cb) return log("No callback found for 'getStopsSupportedByRoute' call.");

      return cb(data.rows);
    });
  };

  // Returns a history of buses logged on this route.
  this.getRouteHistory = function(route, cb){

    // Parse route argument.
    route = parseRouteArg(route);

    db.query(`
      SELECT
        b.id,
        b."pingDate",
        b."pageDate",
        b."scrapeDate",
        r."name" as "route",
        s."name" as "stopName",
        s."abbreviation" as "stopAbbreviation",
        b."isAtStop",
        b."scrapeInterval"
        FROM buses.log b
        JOIN buses.stop_info s
        ON b."stopID"=s.id
        JOIN buses.route_info r
        ON b."routeID" = r.id
        WHERE b."routeID"=(SELECT id FROM buses.route_info WHERE "${route.property}"='${route.value}');
      `, (err, data) => {
      if (err) log(`Failed to get route history for route:${route.value}: ${err}`);
      if (!cb) return log("No callback found for 'getRouteHistory' call.");

      return cb(data.rows);

    });
  };

  // Returns a history of buses logged at this stop.
  this.getStopHistory = function(stop, cb){

    // Parse stop object.
    stop = parseStopArg(stop);

    db.query(`
      SELECT
        b.id,
        b."pingDate",
        b."pageDate",
        b."scrapeDate",
        r."name" as "route",
        s."name" as "stopName",
        s."abbreviation" as "stopAbbreviation",
        b."isAtStop",
        b."scrapeInterval"
        FROM buses.log b
        JOIN buses.stop_info s
        ON b."stopID"=s.id
        JOIN buses.route_info r
        ON b."routeID" = r.id
        WHERE b."stopID"=(SELECT id FROM buses.stop_info WHERE "${stop.property}"='${stop.value}');
      `, (err, data) => {

      if (err) log(`Failed to get log history for ${stop.value}: ${err}`);
      if (!cb) return log("No callback found for 'getStopHistory' call.");

      return cb(data.rows);

    });

  };

  // Returns all the entries for a passed stopID & routeID.
  this.getStopAndRouteEntries = function(stop, route, cb){

    // Pares the stop and route arguments.
    stop = parseStopArg(stop);
    route = parseRouteArg(route);

    checkDB(dbName);

    db.query(`
      SELECT
        b.id,
        b."pingDate",
        b."pageDate",
        b."scrapeDate",
        r."name" as "route",
        s."name" as "stopName",
        s."abbreviation" as "stopAbbreviation",
        b."isAtStop",
        b."scrapeInterval"
        FROM ${dbName} b
        JOIN buses.stop_info s
        ON b."stopID"=s.id
        JOIN buses.route_info r
        ON b."routeID" = r.id
        WHERE b."routeID"=(SELECT id FROM buses.route_info WHERE "${route.property}"='${route.value}')
        AND
        b."stopID"=(SELECT id FROM buses.stop_info WHERE "${stop.property}"='${stop.value}');
      `, (err, data) => {

      if (err) log(`Failed to getStopAndRouteEntries for stop: ${stop.value} and route: ${route.value} : ${err}`);
      if (!cb) return log("No callback found for 'getStopAndRouteEntries' call.");

      return cb(data.rows);

    });

  };

}

module.exports = dataInterfaceMain;


// UTIL.
function log(msg){
  console.log("[DATA-INTERFACE-MAIN.js] " + msg);
}

function checkDB(dbName){
  if (dbName !== "buses.log")
    return
      log(`[WARN] Current data interface is configured with 'live'.
            Current request uses 'buses.log' table. Please use correct INTERFACE.`);
}

// Allows for just a route name to be passed, if specific property name is not
// specified.
function parseRouteArg(route){
  if (!route.value || !route.property) {
    var temp = route;
    route = {
      property: 'name',
      value: temp
    }
  }
  return route;
}

// If the stop property to be queried for is not specified, assumes that a
// stop abbreviation has been passed.
function parseStopArg(stop){
  if (!stop.property || !stop.value) {
    var temp = stop;
    stop = {
      value: stop,
      property: 'abbreviation'
    };
  }
}

function Result(data){

  // Store the data which is passed to the object.
  this.data = data;


  // We need a way of chaining multiple queries together to allow for
  // better opration.


}
