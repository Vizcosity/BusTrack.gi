// Takes in the log file, migrates all the data to the DB!
var DB = require('../db/crawler-db-interface.js');
var db = new DB();

var log = require('./log.json');

var routes = Object.keys(log.routes);

var logItems = [];


for (var j = 0; j < routes.length; j++){

  var items = log.routes[routes[j]].history;

  if (!log.routes[routes[j]].history) return console.log(log.routes[routes[j]]);

  for (var i = 0; i < log.routes[routes[j]].history.length; i++){

    log.routes[routes[j]].history[i].buses = renameKeyValues(log.routes[routes[j]].history[i].buses);
    log.routes[routes[j]].history[i].routeID = routes[j];

    if (!log.routes[routes[j]].history[i].logdate){

      log.routes[routes[j]].history[i].logdate = log.routes[routes[j]].history[i].date;
      delete log.routes[routes[j]].history[i].date;

    }

    // console.log(log.routes[routes[j]].history[i]);
    // db.insert(log.routes[routes[j]].history[i]);
    logItems.push(log.routes[routes[j]].history[i]);

  }
}

// Once all of the items have been added, recursively go through and add each item.
//
//
function addItem(items, cb){

  console.log("Adding item for DB inserton.");

  if (items.length == 0) return cb();

  var ci = items.shift();

  console.log(ci);

  db.insert(ci, () => {
    addItem(items, cb);
  });

}

addItem(logItems, () => {
  log("Finished adding all items to DB.");
});




// console.log(log.routes[8].history.length);

function renameKeyValues(buses){

  // console.log(buses);

  var output = [];

  for (var i = 0; i < buses.length; i++){
    output.push({
      atStop: buses[i].atStop,
      stopID: buses[i].stopID ? buses[i].stopID : buses[i].lastStop,
      interval: buses[i].interval ? buses[i].interval : buses[i].timeSince,
      rawscrape: buses[i].rawscrape ? buses[i].rawscrape : buses[i].raw
    });
  }

  return output;

}
