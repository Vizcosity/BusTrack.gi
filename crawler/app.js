
// Dependencies
const getPage = require('./modules/getWebpage.js');
const fs = require('fs');
var config = require('./config.json');
const parse = require('./modules/parse.js');
const cliArgs = require('command-line-args');
const querystring = require('querystring');
const moment = require('moment');


const CrawlerDBInterface = require("../db/crawler-db-interface.js");
const dbInterface = new CrawlerDBInterface();


const cliOptionSchema = [
  {name: 'verbose', alias: 'v', type: Boolean},
  {name: 'interval', alias: 'i', type: Number, defaultValue: config.crawlInterval}
];


const cliOptions = cliArgs(cliOptionSchema);
const _SCRAPEINTERVAL = cliOptions.interval;

log("Initializing crawler.");

log("Loading ROUTES: " + config.routes.toString() + ". Starting crawl process with Interval ["+_SCRAPEINTERVAL+"]");

// Set a recurring crawl.
setInterval(function(){
  var routes = arrCopy(config.routes);
  runCrawl(routes);
}, _SCRAPEINTERVAL);


// Define the crawl function which will open the webpage for each bus route and scrape
// relevant info.
function runCrawl(routeNumArray){

  // Exit condition.
  if (routeNumArray.length == 0) return;

  log("Remaining Routes: "+routeNumArray.toString());

    var route = routeNumArray.shift();

    scrapeRoute(route, function(routeData){

      // Notify of current store.
      log("Collected data for Route: " + route);

      // Notify of insertion to DB.
      log("Adding Route["+route+"] data to the DB.");

      console.log(routeData);

      // Add to DB and run next crawl on callback.
      dbInterface.insert(routeData, (err) => {

          // Error / success reporting.
          if (!err) log("Successfully added ROUTE: ["+route+"] crawl info to DB.")
          else log(`Could not add ${route}: ${err}`);

          // Recursively call runCrawl.
          runCrawl(routeNumArray);
      });
    });

}

// Get the route info.
function scrapeRoute(routeNumber, callback){

  console.log(`Scraping: ${routeNumber}`)

  // Prepare the url.
  var url = config.scrape.url.base + "?" + querystring.stringify({id: routeNumber, sys: 1});

  // Get the page.
  getPage(url, ($) => {

    // Two dates:
    // (1) Date of the crawl (this process): assigned at DataEntry construction.
    // (2) Date displayed on page.

    var pageDate;

    // Parse the pageDate.
    pageDate = getPageDate($);

    // Get information for each bus.
    // Requires:
    //  - stopID [String]
    //  - pingDate [Date]
    //  - scrapeInterval [Number]
    //  - atStop [Boolean]
    //  - rawScrape [String] (DEBUG)
    var buses = getBusesInfo($);

    // For each bus, create a Data Entry object for insertion into the
    // database.
    var dataEntries = createDataEntryObjects(routeNumber, pageDate, buses);

    // Return the data entries.
    return callback(dataEntries);

  });

}

/**
 * [Object to be inserted into the DB]
 * @param       {Number}  routeID   [ID of the route being scraped]
 * @param       {String}  stopID    [ID of the Stop at which the bus is located]
 * @param       {Date}  pingDate  [Date at which the bus was pinged]
 * @param       {Date}  pageDate  [Date displayed on scraped page]
 * @param       {Boolean} isAtStop  [Truth value determining if bus is at the stop]
 * @param       {String}  rawscrape [The raw text value of the scrape (for debugging)]
 * @constructor
 */
function DataEntry(routeID, stopID, pingDate, pageDate, isAtStop, scrapeInterval, rawscrape){

  // The date from which the bus location information was last accurate (
  // the last ping to the bus in question).
  this.pingDate = pingDate;

  // The date displayed on the page that was scraped.
  this.pageDate = pageDate;

  // Generate the log date automatically at this point.
  // The scrapeDate is the date in which the scrape took place / was logged.
  this.scrapeDate = new Date();

  // Meta data.
  this.routeID = routeID;
  this.stopID = stopID;

  // Boolean value determining whether or not the bus is currently at the stop.
  this.isAtStop = isAtStop;

  // Current scrape interval setting, used for graph modelling.
  this.scrapeInterval = scrapeInterval;

  // Used for debugging / accuracy checking.
  this.rawScrape = rawscrape;

}

// Prepares each bus as an object and attaches date info.
// Then, DataEntry objects are constructed for each bus passed.
function createDataEntryObjects(routeID, pageDate, busesInfo){

  // Create bus objects for each busInfo item passed.
  var buses = [];

  busesInfo.forEach(bus => {

    // Push new bus object to the buses array.
    buses.push(new Bus(pageDate, bus.rawScrape, bus.stopName, _SCRAPEINTERVAL));

  });

  // After bus objects have been prepared, we can construct all the DataEntry
  // objects.

  var dataEntries = [];

  buses.forEach(bus => {

    // Skip the current iteration if pingDate is null.
    if (!bus.pingDate) return false;

    // Push new data entry to the output array for each bus item in the buses
    // array.
    dataEntries.push(
      new DataEntry
      (
        routeID,
        bus.stopID,
        bus.pingDate,
        bus.pageDate,
        bus.isAtStop,
        bus.scrapeInterval,
        bus.rawScrape
      )
    );

  });

  // Return prepared Data Entries.
  return dataEntries;
}

// Takes in a jQuery page, returns the date displayed on the page.
// The date on the page is an indication of the accuracy of the information
// (since when it was last valid, accurate as of).
function getPageDate($){

  // Date-time format (for moment.js parsing).
  var parseFormat = config.scrape.parse.dateTimeFormat;

  // Get the raw text.
  var shortFormDate = $($('div[data-role="content"] p b')[3]).text();
  var time = $($('div[data-role="content"] p b')[4]).text();

  // Parse the information with momentjs.
  return moment(shortFormDate + " " + time, parseFormat).toDate();

}

// Takes rawscrape text and page date,
function getPingDate(rawScrape, pageDate){

  // Parse timeSince from rawscrape in ms.
  var timeSince = parse.timeSince(rawScrape);

  // If timeSince is null, return null for pingdate.
  if (!timeSince) return null;

  // Convert timeSince from seconds to milliseconds.
  var timeSinceMS = timeSince * 1000;

  // Create a new date by removing the timeSince from the pageDate.
  // This will be the pingDate.

  return new Date(pageDate - timeSinceMS);

}

// Takes in rawScrape and determines whether or not the bus is currently
// at the stop.
function getIsAtStopBool(rawScrape){

  // If contains 'leaving', then not at stop.
  return !((rawScrape.indexOf('Leaving') !== -1) || (rawScrape.indexOf('leaving') !== -1));

}

// Takes in the full stopName and returns stop id.
function getStopID(stopName){

  // First prepare the stopName (remove 'Leaving ' if contained.);
  stopName = stopName.replace('Leaving ', '');

  // Remove trailing ' Bus Stop' from the string if present.
  stopName = stopName.replace(' Bus Stop', '');

  // Reference parse module.
  // return parse.resolveBusStopName(stopName);
  return stopName;

}

/**
 * [Get Data for each bus]
 * @param  {jQuery Object} $ [jQuery factory object]
 * @return {Array}   [Data for each bus]
 */
function getBusesInfo($){

  // Create output object.
  var output = [];

  // Get the full stop name, time since and raw scrape for each bus.

  var buses = $('i');

  // Loop through each bus and get the full stop name and rawscrape.
  for (var i = 0; i < buses.length; i++){

    // Save current item to a variable.
    var ci = $(buses[i]);

    // Get rawscrape text.
    var rawScrape = ci.text();

    // Get the stop name.
    var stopName = $(ci.children('b')).text();

    // Push the stopName + rawscrape to the output array.
    output.push({
      rawScrape: rawScrape,
      stopName: stopName
    });

  }

  // Return the output array.
  return output;

}

// Takes in rawScrape text and determines if

function Bus(pageDate, rawScrape, stopName, scrapeInterval){

  // Raw scrape text for debugging.
  this.rawScrape = rawScrape;

  // Scrape interval used for graph modelling.
  this.scrapeInterval = scrapeInterval;

  // Page date scraped.
  this.pageDate = pageDate;

  // Computed properties:
  this.stopID = getStopID(stopName);
  this.isAtStop = getIsAtStopBool(rawScrape);
  this.pingDate = getPingDate(rawScrape, pageDate);

}

// Receives the raw bus strring info and parses it to a useful object.
function parseBusesInfo(rawText){

  var components = rawText.split("...");
  var organizedComponents = [];

  // Reorganize the components into array of objects of strings of
  // the stop and the time since ping.
  for (var i = 0; i < components.length; i++){

    // By default the bus is not at the stop.
    // var atStopBool = false;

    // Skip current iteration if null or empty.
    if (!components[i]) continue;

    var subNameAndTimeComponent;

    // Split componenets if a comma exists.
    if (components[i].indexOf(", ") !== -1){

      subNameAndTimeComponent = components[i].split(", ");

      // Remove the 'bus stop' string.
      subNameAndTimeComponent[0] = filterOutWordFromString(subNameAndTimeComponent[0], " Bus Stop");

    }
    else
      subNameAndTimeComponent = components[i].split(" Bus Stop ");

    // If component does not contain 'leaving', then we set atStopBool to true,
    // and prepare the proper name.
    if (!contains(subNameAndTimeComponent[0], 'Leaving') && !contains(components[i], 'Leaving')) {
      atStopBool = true;
    } else {
      // If the component does contain the word 'Leaving ', then we remove it.
      subNameAndTimeComponent[0] = filterOutWordFromString(subNameAndTimeComponent[0], "Leaving ");
    }

    var busStopName = parse.resolveBusStopName(subNameAndTimeComponent[0]);
    // var timeSince = parse.timeSince(subNameAndTimeComponent[1]);

    organizedComponents.push(
      new Bus(
        busStopName, // Bus stop abbr. name
        timeSince,   // Time since last stop ping.
        atStopBool,  // Is the bus currently at the stop?
        components[i] // Used for reference / debugging.
      )
    );

  }

  // Return organized component array.
  return organizedComponents;

}

// Utility functions (To be separated).
function filterOutWordFromString(source, wordToRemove){

  // Return the source if the wordToRemove not existant in the string.
  if (source.indexOf(wordToRemove) == -1) return source;

  return source.replace(wordToRemove, "");

}

function log(message){
  if (cliOptions.verbose) console.log("[BUS CRAWLER] "+message);
}

function contains(source, matchingString){
  return source.indexOf(matchingString) !== -1;
}

function arrCopy(arr){
  var output = [];

  for (var i = 0; i < arr.length; i++){
    output.push(arr[i]);
  }

  return output;
}
