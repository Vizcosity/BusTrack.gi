/**
 * This is the analysis modules which will be conducting calculations based
 * off of the data which is scraped by the crawler.
 *
 * It will construct a directed connected Graph for each route which will allow
 * us to model each stop as a node, and the path from each node to node as an
 * edge.
 *
 * Nodes will be represented as a stop Object, while edges will have a number of
 * certain properties such as an ETA for the edge distance, and a sort of log
 * to keep track of this.
 */

// DEPENDENCIES
// Will be using a Graph library.
const Graph = require('graphlib').Graph;
const INTERFACE = require('../data-interface/data-interface-main.js');

// Load up the interface's to the DB.
const liveDB = new INTERFACE('live');
const logDB = new INTERFACE('stoplog');

var graphs = require('./graphs.json');

// Each graph will be held inside of this.
var route = {};


// We construct the first route (2).
route[2] = new Graph();

logDB.getStopsSupportedByRoute(2, (stops) => {

  for (var i = 0; i < stops.length; i++){
    route[2].setNode(stops[i].id, stops[i]);
  }

  console.log("Doing nodes");

  console.log(route[2].nodes());

  for (var i = 0; i < route[2].nodes().length; i++){

    var cn = route[2].nodes()[i];

    console.log("Next Stop For " + cn + " is " + getNextStop(cn));
  }


});

function getNextStop(stop){
  return graphs.sequence[2][graphs.sequence[2].indexOf(stop) + 1]
}
