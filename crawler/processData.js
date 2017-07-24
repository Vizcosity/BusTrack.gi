// Process the data, remove 'leaving' from each entry in favour of boolean and reformat timeSince to be
// integer number of seconds since last stop.

var fs = require('fs');
var crawlLog = require("./log.json");

log("Processing bus entry log...");

  // Get the routes and sort them.
  var routes = Object.keys(crawlLog.routes);

  console.log(routes);

  for (var i = 0; i < routes.length; i++){

    log("ROUTE: " + routes[i] + " of " + routes.length);

    // Go through the history for each route. Make an entry for each stop.
    var currentHistory = crawlLog.routes[routes[i]].history;


    for (var j = 0; j < currentHistory.length; j++){

      if (!currentHistory[j].buses) continue;

      var currentBuses = currentHistory[j].buses;

      for (var k = 0; k < currentBuses.length; k++){

        log(currentBuses[k].lastStop + " ["+k+"/"+currentBuses.length+"]");


        // If atStop is not null, has already been set and thus can be skipped.
        if (currentBuses[k].atStop !== null) continue;


        // If the bus stop name string includes 'leaving', make atStop false;
        if (currentBuses[k].lastStop.substring(0, "Leaving".length).toLowerCase() == "leaving"){

          // Remove 'leaving' from the title.
          currentBuses[k].lastStop = currentBuses[k].lastStop.substring("leaving".length + 1, currentBuses[k].lastStop.length);

          // Set atStop to false.
          currentBuses[k].atStop = false;

        } else {

          // The bus is at the current stop.
          // Set atStop to true.
          currentBuses[k].atStop = true;

        }

      }

    }

  }

  // Write to processed json data file.
  fs.writeFile('processedLog.json', JSON.stringify(crawlLog, null, 2), function callback(err){
    if (err){log("Saving JSON log: " + err)};
    log("Done!");
  });



function log(message){
  console.log("[DATA PROCESSOR] "+message);
}
