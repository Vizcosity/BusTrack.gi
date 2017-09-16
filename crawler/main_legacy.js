// Dependencies
const Horseman = require("node-horseman");
const fs = require('fs');
var config = require('./config.json');
const parse = require('./modules/parse.js');
const cliArgs = require('command-line-args');

const CrawlerDBInterface = require("../db/crawler-db-interface.js");
const dbInterface = new CrawlerDBInterface();

const cliOptionSchema = [
  {name: 'verbose', alias: 'v', type: Boolean},
  {name: 'interval', alias: 'i', type: Number, defaultValue: config.crawlInterval}
];

const cliOptions = cliArgs(cliOptionSchema);
const scrapeInterval = cliOptions.interval;


log("Initializing horseman crawler...");

// Initialize the crawler.
var crawler = new Horseman();

log("Horseman loaded.");
log("Loading ROUTES: " + config.routes.toString() + ". Starting crawl process with Interval ["+scrapeInterval+"]");

// Set a recurring crawl.
setInterval(function(){
  var routes = arrCopy(config.routes);
  runCrawl(routes);
}, scrapeInterval);


// Define the crawl function which will open the webpage for each bus route and scrape
// relevant info.
function runCrawl(routeNumArray){

  // Exit condition.
  if (routeNumArray.length == 0) return;

  log("Remaining Routes: "+routeNumArray.toString());

    var route = routeNumArray.shift();

    getRouteInfo(route, function(routeData){

      log("Current ROUTE: " + route);

      // Add the routeID to the routeData object to be passed onto the database!
      routeData.routeID = route;

      // Add to DB and run next crawl on callback.
      dbInterface.insert(routeData, () => {
          log("Successfully added ROUTE: ["+route+"] crawl info to DB.");
          runCrawl(routeNumArray);
      });
    });

}

function getRouteInfo(routeNumber, callback){

  // Open the webpage for the specific route.
  crawler.open("http://track.bus.gi/routeInfo.php?id="+routeNumber+"&sys=1");

  // Create the variables that will store the bus data.
  var crawlDate = null;
  var busInfo = [];

  // Grab the time and date for the current crawl.
  crawler.text("p").then(function(rawText){
    crawlDate = parseDate(rawText);

    // Grab the bus information.
    crawler.text("i").then(function(rawBusInfo){

      // Parse the raw bus string info and save to the variable.
      busInfo = parseBusesInfo(rawBusInfo);

      // Info should be gathered at this point, callback can be executed.
      if (callback) callback({logdate: crawlDate, buses: busInfo});

    });
  });
}

// BusLogEntry object constructor. Used everytime an entry is added to the log.
function BusLogEntry(date, buses){
  this.date = new Date(date);
  this.numberOfBuses = buses.length;
  this.buses = buses;
}

// Bus object constructor.
function Bus(stopID, interval, atStop, rawscrape){
  this.stopID = stopID;
  this.interval = interval;
  this.atStop = atStop;
  if (rawscrape) this.rawscrape = rawscrape; // Used for debugging / accuracy checking.
}

// Takes in the raw string from the site and parses into a proper date.
function parseDate(rawString){

  // First need to delimit by weird characters.
  rawString = rawString.split("\t");

  // Assign null values for now.
  var dateString = null;
  var timeString = null;

  for (var i = 0; i < rawString.length; i++){

    if (rawString[i].indexOf("Date: ") != -1){
      dateString = rawString[i].substring("Date: ".length, rawString[i].indexOf("\n"));
    }

    if (rawString[i].indexOf("Time: ") != -1){
      timeString = rawString[i].substring("Time: ".length, rawString[i].indexOf("\n"));
    }

  }

  // Reverse the date string, and replace the delimiter to a standard dash.
  dateString = reverseDate(dateString.replace(/\//g, "-"));

  // console.log(dateString+timeString);

  // Return the completed date object.
  // This will be achieved by concatenating the date and time together such that an
  // acceptable datestring is created which complies with the js Date object constructor.
  return new Date(dateString+"T"+timeString);

}

// Utility method for reversing datestrings.
function reverseDate(input){

  // Set a default value.
  var reversed = input.split("-").reverse();
  var output = "";

  for (var i = 0; i < reversed.length; i++){
    output += reversed[i] + (i != reversed.length - 1 ? "-" : "");
  }

  return output;

}

// Receives the raw bus strring info and parses it to a useful object.
function parseBusesInfo(rawText){

  var components = rawText.split("...");
  var organizedComponents = [];

  // Reorganize the components into array of objects of strings of
  // the stop and the time since ping.
  for (var i = 0; i < components.length; i++){

    // By default the bus is not at the stop.
    var atStopBool = false;

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
    var timeSince = parse.timeSince(subNameAndTimeComponent[1]);

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
