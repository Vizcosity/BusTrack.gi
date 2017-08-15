/**
 * This module will model the routes supplied into a Directed Graph for use with
 * the sibling analysis module. In tandem they will work to recalculate average
 * ETAs between routes and provide shortest-paths for users, as well as be able
 * to determine approaching buses and other information derived from the scraped
 * bus data.
 *
 * @Aaron Baw 2017
 */

 // DEPENDENCIES
 // Will be using a Graph library.
 const Graph = require('graphlib').Graph;
 const INTERFACE = require('../data-interface/data-interface-main.js');

 // Load up the interface's to the DB.
 const liveDB = new INTERFACE('live');
 const logDB = new INTERFACE('stoplog');

 var routeMetaData = require('./routeMeta.json');
 var routeSequence = routeMeta.sequence;

 // Each graph will be held inside of this.
 var route = {};


 // We construct the first route (2).
 route[3] = new Graph();

 logDB.getStopsSupportedByRoute(3, (stops) => {

   for (var i = 0; i < stops.length; i++){
     route[3].setNode(stops[i].id, stops[i]);
   }

   console.log("Doing nodes");

   console.log(route[3].nodes());

   for (var i = 0; i < route[3].nodes().length; i++){

     var cn = route[3].nodes()[i];

     console.log("Next Stop For " + cn + " is " + getNextStop(cn));
   }


 });

 function getNextStop(stop){
   return sequence[3][sequence[3].indexOf(stop) + 1]
 }
