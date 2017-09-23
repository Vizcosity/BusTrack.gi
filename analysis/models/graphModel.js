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
const Graph = require('./graph.js');
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
var _AVGETAPERIOD = 'day';

// Prepare as a module.
module.exports = graphModel;

function graphModel(route, properties){

  // Check to see that a route is passed.
  if (!route) throw new Error("No route passed.");

  // Check for passed properties.
  if (properties && properties.debug) _DEBUG = true;
  if (properties && properties.avgETAPeriod) _AVGETAPERIOD = properties.avgETAPeriod;

  // Reference to object instance.
  var self = this;

  // Grab the sequence of stops for the current route.
  var stopSequence = routeSequence[route];

  // Save graph.
  this.graph = constructGraph(stopSequence, route);

  // At this point, the graph should now be constructed.
  // We can start to fill in the data for each (1) Node, and each (2) Edge.
  // To do this we must once again iterate through both all Nodes (Vertices)
  // and Edges.

  // Fill in the graph model with all of the log info for each stop,
  // and subsequently calculate all of the Node and Edge properties.
  log("Populating nodes with entries from stops & route.")
  populateNodes(this.graph.vertices(), route, () => {

    log("Nodes populated for route: "+route+".");

    log("Attempting to process.");

    // For each vertex, process all of the entries that have been added.
    processNodeEntries(this.graph.vertices());

    log("Finished processing nodes.");

    log("Processing Graph edges now.");

    processEdges(this.graph);

    // Graph constructed.
    log("Graph succesfully constructed.");

  });

  //TODO: PROCESS GRPAH NODES & EDGES; FILL IN WITH DATA FOR NODE & EDGE.
  //TODO: IMPLEMENT NODE OBJECT CONSTRUCTOR.

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

// Takes in graph and processes all edges.
function processEdges(graph){

  graph.edges().forEach((edge) => {

    // Process the edge.
    processEdge(edge.element, graph);

  });

}

// Takes in an edge and processes the ETAs for this edge.
function processEdge(edge, graph){

  // Each edge should have linked the node from which the edge originates from,
  // and also terminates.
  var sourceNode = graph.getVertexValue(edge.source);
  var destNode = graph.getVertexValue(edge.destination);

  // We need to find a matching pair of dates, where the following conditions apply:
  //  (1) The sourceNode date occurs before.
  //  (2) The destNode date occurs after.
  //  (3) The sourceNode date is a departure.
  //  (4) The destNode date is an arrival.

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

  // After recalculating ETAs, set the weight of the edge.
  edge.weight = edge.getETA(_AVGETAPERIOD);

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
    node.element.processEntries();

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
  var stopID = vertex.id;

  log("Populating Node: " + stopID);

  logDB.getStopAndRouteEntries(stopID, route, (entries) => {

    // For each log item we get, add it with the associated Node object method.
    entries.forEach((entry) => {

      // Add the entry to the node.
      vertex.element.addEntry(entry);

    });

    // After we add all of the entries to the graph, we want to process all
    // of the additions.
    // vertex.value.processEntries();
    log("Finished adding data to node: " + vertex.id + ". Processing now.");

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

    // Check to see if vertex exists. If it does, do not add it again.
    if (graph.hasVertex(stopID)) return false;

    graph.addVertex(stopID, new Node(stopID));

  });

  log("Linking nodes and edges.");

  // After adding all of the verteces, we iterate through the stopSequence
  // once again to link each of the nodes together.
  stopSequence.forEach((stopID, i) => {

    var previousNode = graph.getVertexValue(moduloArrayItem(stopSequence, i - 1));
    var currentNode = graph.getVertexValue(stopID);
    var nextNode = graph.getVertexValue(moduloArrayItem(stopSequence, i + 1));

    // Link the two nodes together.
    currentNode.linkNodes(previousNode, nextNode);

    var currentStopID = currentNode.stop;
    var nextStopID = nextNode.stop;

    log("Current stopID: " + currentStopID + " [i = "+(i)+"], Next stopID: " + nextStopID + " [i = "+(i+1)+"]");

    // Create edege link between nodes.
    graph.addEdge(currentStopID, nextStopID, new Edge(currentStopID, nextStopID));

  });

  // Once the base graph has been constructed we can return it.
  return graph;

}

// Get array item with modular arithmetic.
function moduloArrayItem(array, i){

  var index;

  if (i < 0) {
    index = array.length - (Math.abs(i) % array.length);
    return moduloArrayItem(array, index);
  }
  else index = Math.abs(i) % array.length;

  // Return!
  return array[index];

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
