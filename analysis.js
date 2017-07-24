// Fill in the timingStore data in order.

// DEPENDENCIES
var fs = require('fs');
var timingStore = require("./timingStore.json");
var crawlLog = require("./crawler/log.json");

function fillTimingData(){

  // Get the routes and sort them.
  var routes = Object.keys(crawlLog.routes).sort();

  for (var i = 0; i < routes.length; i++){

    // If no route entry, add it to the timingstore.
    if (!timingStore[routes[i]]) timingStore[routes[i]] = {};

    // Go through the history for each route. Make an entry for each stop.
    var currentHistory = crawlLog.routes[routes[i]].history;

    for (var i = 0; i < currentHistory.length; i++){
      if (currentHistory[i].lastStop.indexOf("Leaving") == -1){
        // Do not include buses that are inbetween stops as they are yet to be processed
      }
    }

  }
}
