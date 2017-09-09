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
const Graph = require('js-graph/dist/js-graph.full.js');
const INTERFACE = require('../../data-interface/data-interface-main.js');

// MODELS
const Edge = require('./edge.js');
const Node = require('./node.js');

// Load up the interface's to the DB.
const liveDB = new INTERFACE('live');
const logDB = new INTERFACE('stoplog');

var routeMetaData = require('../routeMeta.json');
var routeSequence = routeMetaData.sequence;

// Properties
var _DEBUG = false;

// Prepare as a module.
module.exports = graphModel;

function graphModel(route, properties){

  // Check for passed properties.
  if (properties && properties.debug) _DEBUG = true;

  // Reference to object instance.
  var self = this;

  // Grab the sequence of stops for the current route.
  var stopSequence = routeSequence[route];

  // Save graph.
  this.graph = constructGraph(stopSequence, route);

  // Check if there exists a path between two given stops / nodes.
  this.hasPath = function(startStop, endStop) {

    // Resolve stops to just the stop id if full node objects are passed.
    var startStopID = (typeof startStop === "string" ? startStop : startStop.stop);
    var endStopID = (typeof endStop === "string" ? endStop : endStop.stop);

    return hasPath(startStopID, endStopID, stopSequence);

  }

  // Get path between two given stops / nodes.
  this.getPath = getPath(startStop, endStop, prop, stopSequence);

  // At this point, the graph should now be constructed.
  // We can start to fill in the data for each (1) Node, and each (2) Edge.
  // To do this we must once again iterate through both all Nodes (Vertices)
  // and Edges.

  // Fill in the graph model with all of the log info for each stop,
  // and subsequently calculate all of the Node and Edge properties.
  log("Populating nodes with entries from stops & route.")
  populateNodes(graphToVertexArray(this.graph), route, () => {

    log("Nodes populated for route: "+route+".");

    log("Attempting to process.");

    // For each vertex, process all of the entries that have been added.
    processNodeEntries(graphToVertexArray(this.graph));

    log("Finished processing nodes.");

    log("Processing Graph edges now.");

    processEdges(this.graph);

    // Graph constructed.
    log("Graph succesfully constructed.");

  });

  //TODO: PROCESS GRPAH NODES & EDGES; FILL IN WITH DATA FOR NODE & EDGE.
  //TODO: IMPLEMENT NODE OBJECT CONSTRUCTOR.



  // Object Utility.

  // Return all of the vetices as an array.
  this.vertexArray = function(){
    return graphToVertexArray(self.graph);
  }

  // Return all of the edges of the graph as an array.
  this.edgeArray = function(){
    return graphToEdgeArray(self.graph);
  }

}


// OBJECTS

// ETADatePair object to be pushed to the findDatePairs output array.
// This will eventually be added to a graph edge for ETA calculation and logging.
function ETADatePair(departureItem, arrivalItem){

  // Arrival & departure properties.
  this.arrival = arrivalItem;
  this.departure = departureItem;

}

// UTILITY FUNCTIONS

// Returns boolean value determining if there is a path between two nodes
// specified.
function hasPath(startStopID, endStopID, stopSequence){

  // If both stops are contained within the stop sequence then there is a path.
  return
    (stopSequence.indexOf(startStopID) !== -1)
    &&
    (stopSequence.indexOf(endStopID) !== -1);

}

// Calculates the path for a given start and end node.
function getPath(startNode, endNode, opt, stopSequence){

  // If no path between the two nodes, then return empty array (no path).
  if (!hasPath(startNode, endNode, stopSequence)) return [];

  // etaAvgPeriod is 'day' by default.
  var etaAvgPeriod = 'day';
  // Change if otherwise specified by passed argument.
  if (opt && opt.etaAvgPeriod) etaAvgPeriod = opt.etaAvgPeriod;

  // Construct the path array.
  var path = [];

  // Counter object used to keep track how many times a given node is traversed.
  // If traversal incrementer exceeds number of linked nodes, then we have
  // cycled through the whole graph and can conclude there is no path.
  var traversalCounter = {};

  // Set up our nodes.
  var currentNode = startNode;
  var previousNode = currentNode;

  // Add the first node to the path array.
  path.push(currentNode);

  // Continue looping until current stop is end stop, or no stop found (
  // current stop reached once again, but as startnode as a preceeding node).
  while
  (
    (currentNode.stop !== endNode.stop)
    &&
    (traversalCounter[currentNode.stop] < currentNode.getLinkedNodes().length)
  ){

    // Create entry for traversal counter if it doesn't already exist.
    if (!traversalCounter[currentNode.stop])
      traversalCounter[currentNode.stop] = 0;

    // Increment the traversalCounter.
    traversalCounter[currentNode.stop]++;

    // Get the previous node stop it to calculate the next node from current.
    // (Preceeding node stop id).
    var preceedingNode = previousNode;

    // Set the previous node to the current node.
    previousNode = currentNode;

    // Get the next node in the sequence, according to the node it is coming
    // from (preceeding node).
    currentNode = currentNode.getNextNode(preceedingNode);

    // Edge case: next node not found. (Incorrect node sequence set up likely).
    if (!currentNode) {
      log("Could not get next node from " + previousNode.stop + ".");
      break;
    }

    // Push current node to the path array.
    path.push(currentNode);

  }

  // Return the collected path.
  return path;

}

// Takes in graph and processes all edges.
function processEdges(graph){

  graphToEdgeArray(graph).forEach((edge) => {

    // Process the edge.
    processEdge(edge.value, graph);

  });

}

// Takes in an edge and processes the ETAs for this edge.
function processEdge(edge, graph){

  // Each edge should have linked the node from which the edge originates from,
  // and also terminates.
  var sourceNode = graph.vertexValue(edge.source);
  var destNode = graph.vertexValue(edge.destination);

  // We need to find a matching pair of dates, where the following conditions apply:
  //  (1) The sourceNode date occurs before.
  //  (2) The destNode date occurs after.
  //  (3) The sourceNode date is a departure.
  //  (4) The destNode date is an arrival.

  // console.log("SOURCE: ");
  // console.log(sourceNode);
  //
  // console.log("DESTINATION: ");
  // console.log(destNode);

  // Find all matching date pairs and add to an array.
  var datePairs = findDatePairs(sourceNode, destNode);

  // For each date pair we add it to the edge.
  datePairs.forEach((pair) => {

    // Add the ETA by adding the two dates. The edge module will
    // then process and log accordingly.
    edge.addETA(pair.departure.date, pair.arrival.date);

  });

  // Once we are finished adding all of the date pairs we can recalculate all of
  // the ETAs.

  edge.recalculateETAs();

  // And we are done!

}

// Utility method for the process edge function which constructs an array of
// matching date pairs to be used to calculate edge ETAs.
function findDatePairs(source, destination){

  // Prepare the output array.
  var output = [];

  // If arrivalDate > departureDate then return the dates & pop.

  // We set up the iterators for departures and arrivals.
  var arrivalIterator = new destination.UnprocessedArrivalsIterator();
  var departureIterator = new source.UnprocessedDeparturesIterator();

  // Start from the most recent departure, and then link it to
  // the most recent arrival which occurs after.

  // Save current arrival and departure items as variables.
  var arrival = arrivalIterator.next();
  var departure = departureIterator.next();

  // Perform while loop until either iterator runs out.
  while (arrivalIterator.hasNext() && departureIterator.hasNext()){

    // If the most recent departure time is before most recent arrival time,
    // we push both items to the output array and 'pop' / process them.
    if (departure.date.isBefore(arrival.date)) {

      // Push item to output array.
      output.push(new ETADatePair(departure, arrival));

      // Iterate departure and arrival.
      arrival = arrivalIterator.next();
      departure = departureIterator.next();

      // Continue to next iteration.
      continue;

      // If the departure date is after arrival, continue iterating departure.
    } else if (!departure.date.isBefore(arrival.date)){

      // Iterate departure.
      departure = departureIterator.next();

    }

  }

  // After the while loop terminates we return the output array with all the
  // matching datepair objects.
  return output;


}

// Iterates through each vertex and processes + sorts all of the data entered.
function processNodeEntries(nodes){

  // Iterate through each node.
  nodes.forEach((node) => {

    // Call the process entry method attached to the node.
    node.value.processEntries();

  });

}

// Takes in a Node and a route, then populates the Node with the history for all
// the recorded buses taken at that stop.
function populateNodes(nodes, route, callback){

  // Once base case is reached, return.
  if (nodes.length === 0) return callback(nodes);

  var currentNode = nodes.shift();

  populateNodeWithBusStopLog(currentNode, route, () => {

    // Once the currentNode has been populated, we call parent
    // 'populateNodes' again recursively to continue popping the array
    // and filling in the nodes.
    return populateNodes(nodes, route, callback);

  });

}

// Populates the Node with information about the log of the buses which have
// arrived at this stop and stayed there and departed.
function populateNodeWithBusStopLog(vertex, route, callback){

  // Determine which stop it is that we need to grab.
  var stopID = vertex.key;

  log("Populating Node: " + stopID);

  logDB.getStopAndRouteEntries(stopID, route, (entries) => {

    // For each log item we get, add it with the associated Node object method.
    entries.forEach((entry) => {

      // Add the entry to the node.
      vertex.value.addEntry(entry);

    });

    // After we add all of the entries to the graph, we want to process all
    // of the additions.
    // vertex.value.processEntries();
    log("Finished adding data to node: " + vertex.key + ". Processing now.");

    // Once Node has been properly filled + processed, we return the callback.
    // Adding the vertex for good measure, but probably won't be used.
    return callback(vertex);

  });

}

// Base Graph constructor (extracted from main entry point for tidyness).
// Constructs the graph of all nodes and edges to allow for all data
// processing and entry to take place.
function constructGraph(stopSequence, route){

  // Create the graph.
  var graph = new Graph();

  // For each stop in the sequence, create a node.
  stopSequence.forEach((stopID) => {

    if (!getNextStop(stopSequence, stopID))
      return log(`
        [ERROR] Attempt to get next stop for stopID: '`+stopID+`' has failed.
        Route: '`+route+`'. Please fix sequence and re-model.
        `);

    // log("Adding vertex: " + stopID);
    graph.addVertex(stopID, new Node(stopID));

  });

  log("Linking nodes and edges.");

  // After adding all of the verteces, we iterate through the stopSequence
  // once again to link each of the nodes together.
  stopSequence.forEach((stopID, i) => {

    var previousNode = graph.vertexValue(moduloArrayItem(stopSequence, i - 1));
    var currentNode = graph.vertexValue(stopID);
    var nextNode = graph.vertexValue(moduloArrayItem(stopSequence, i + 1));

    // Link the two nodes together.
    currentNode.linkNodes(previousNode, nextNode);

    var currentStopID = currentNode.stop;
    var nextStopID = nextNode.stop;

    // Create edege link between nodes.
    graph.addNewEdge(currentStopID, nextStopID, new Edge(currentStopID, nextStopID));

  });

  // Once we have created all the vertexes / nodes, we need to create all of the edges.
  // var vertices = graphToVertexArray(graph);
  //
  // // For each vertex, find the destination vertex and add a directed Edge between
  // // the two vertices.
  // vertices.forEach((vertex) => {
  //
  //   var stopID = vertex.key;
  //   var nextStopID = getNextStop(stopSequence, stopID);
  //
  //   // Check for broken links.
  //   if (!nextStopID)
  //     return log(`
  //       [ERROR] Attempt to get next stop for stopID: '`+stopID+`' has failed.
  //       Route: '`+route+`'. Please fix sequence and re-model.
  //     `);
  //
  //   // Add the edge object.
  //   graph.addNewEdge(stopID, nextStopID, new Edge(stopID, nextStopID));
  //
  //   // Link the prev & next nodes.
  //   vertex.value.setNextNode(graph.vertexValue(nextStopID));
  //   graph.vertexValue(nextStopID).setPrevNode(vertex.value);
  //
  //   // Set the next node link for the current node.
  //   vertex.value.linkNode();
  //
  // });

  // Once the base graph has been constructed we can return it.
  return graph;

}

// Get array item with modular arithmetic.
function moduloArrayItem(array, i){

  // Return!
  return array[Math.abs(i) % array.length];

}

// Takes in a stopID and returns the next stop (if there is one).
function getNextStop(sequence, stop){

  // First we need to check that the sequence has a successor, if not, return false.
  if (sequence.indexOf(stop) == -1) {
    log("Stop: " + stop + " has no successor");
    return false;
  }

  // See if it is the last stop or not, and return the first stop if true. (wrap)
  if (sequence.indexOf(stop) == (sequence.length - 1)) return sequence[0];

  // Otherwise we just want to return the next array item in the sequence.
  return sequence[ sequence.indexOf(stop) + 1 ];

}

// Converts vertices to an array which is a bit prettier to work with.
function graphToVertexArray(graph){

  var output = [];

  var vertices = graph.vertices();

  var vertex = vertices.next();

  while (!vertex.done)  {


    output.push({key: vertex.value[0], value: vertex.value[1]});

    vertex = vertices.next();

  };

  return output;

}

// Converts edges to an array which is a bit prettier to work with.
function graphToEdgeArray(graph){

  var output = [];

  var edges = graph.edges();

  var edge = edges.next();

  while (!edge.done)  {

    output.push({from: edge.value[0], to: edge.value[1], value: edge.value[2]});

    edge = edges.next();

  };

  return output;

}

// Utility functions.
function log(message){
  if (_DEBUG) console.log('[graphModel.js] ' + message);
}
