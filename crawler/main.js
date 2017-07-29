// Dependencies
var Horseman = require("node-horseman");
var fs = require('fs');
var config = require('./config.json');
var parse = require('./modules/parse.js');

log("Initializing horseman crawler...");

// Initialize the crawler.
var crawler = new Horseman();

log("Horseman loaded.");

// Grab the interval from the cli otherwise choose default val of 4 seconds.
var interval = process.argv[2] ? process.argv[2] : 4000;

// Set a recurring crawl.
setInterval(function(){
  var routes = arrCopy(config.routes);
  runCrawl(routes);
}, interval);


// Define the crawl function which will open the webpage for each bus route and scrape
// relevant info.
function runCrawl(routeNumArray){

  // Exit condition.
  if (routeNumArray.length == 0) return;

  console.log(routeNumArray);

    var route = routeNumArray.shift();
    log("ROUTE: " + route);
    getRouteInfo(route, function(routeData){

      console.log(routeData);

      var logCache = require("./log.json");
      log("ROUTE: " + route);

      // TEMP:
        // check for access of route existance first.
        // IF they do not exist for the current route, create them.
        if (!logCache.routes) logCache.routes = {};
        if (!logCache.routes[route]) logCache.routes[route] = {current: {}, history: []};

      // Once JSON structure has been prepared / checked, we can add the information.
      logCache.routes[route].current = routeData;
      logCache.routes[route].history.push(routeData);

      // Resave the JSON file.
      fs.writeFile('log.json', JSON.stringify(logCache, null, 2), function callback(err){
        if (err){log("Saving JSON log: " + err)};
        // Call the function again with the remainder of the array.
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

      console.log(rawBusInfo);

      // Parse the raw bus string info and save to the variable.
      busInfo = parseBusesInfo(rawBusInfo);

      // Info should be gathered at this point, callback can be executed.
      if (callback) callback({date: crawlDate, buses: busInfo});

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
function Bus(lastStop, timeSince, atStop, raw){
  this.lastStop = lastStop;
  this.timeSince = timeSince;
  this.atStop = atStop;
  if (raw) this.raw = raw; // Used for debugging / accuracy checking.
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

  console.log(dateString+timeString);

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

  // By default the bus is not at the stop.
  var atStopBool = false;

  var components = rawText.split("...");
  var organizedComponents = [];

  // Reorganize the components into array of objects of strings of
  // the stop and the time since ping.
  for (var i = 0; i < components.length; i++){

    // Skip current iteration if null or empty.
    if (!components[i]) continue;

    var subNameAndTimeComponent;

    console.log("Component: " + components[i]);

    if (components[i].indexOf(", ") !== -1){

      console.log("comma detected.");

      subNameAndTimeComponent = components[i].split(", ");

      console.log(subNameAndTimeComponent);

      // Remove the 'bus stop' string.
      subNameAndTimeComponent[0] = filterOutWordFromString(subNameAndTimeComponent[0], " Bus Stop");

      console.log("Filter out 'Bus Stop'");
      console.log(subNameAndTimeComponent);

    }
    else
      subNameAndTimeComponent = components[i].split(" Bus Stop ");

    // If component does not contain 'leaving', then we set atStopBool to true,
    // and prepare the proper name.
    if (subNameAndTimeComponent[0].indexOf("Leaving ") == -1) {
      atStopBool = true;
    } else {
      // If the component does contain the word 'Leaving ', then we remove it.
      subNameAndTimeComponent[0] = filterOutWordFromString(subNameAndTimeComponent[0], "Leaving ");
    }

    // Check to see for presence of delimiting comma, if not separate manually based
    // off 'Bus Stop' string.
    // if (subNameAndTimeComponent[0].indexOf("ago") !== -1){
    //   subNameAndTimeComponent[0] = filterOutWordFromString(subNameAndTimeComponent[0], " over an hour ago");
    //   subNameAndTimeComponent[1] = subNameAndTimeComponent[0].split("Bus Stop")[1]; // Signals a timeout ping.
    // }

    console.log(subNameAndTimeComponent);

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
  console.log("[BUS CRAWLER] "+message);
}

function arrCopy(arr){
  var output = [];

  for (var i = 0; i < arr.length; i++){
    output.push(arr[i]);
  }

  return output;
}
