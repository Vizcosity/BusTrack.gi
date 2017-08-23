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

// Prepare as a module.
module.exports = graphModel;

function graphModel(route){

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
  populateNodes(graphToVertexArray(this.graph), route, () => {
    log("Nodes populated for route: "+route+".");

    log("Attempting to process.");

    // For each vertex, process all of the entries that have been added.
    processNodeEntries(graphToVertexArray(this.graph));

    log("Done!");

    graphToVertexArray(this.graph).forEach((vertex) => {
      console.log(vertex.key + ": " +vertex.value.log.atStop.avg.hour);

      console.log(vertex.value.mostRecentArrival());
    })

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

// UTILITY FUNCTIONS

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

  // Once we have created all the vertexes / nodes, we need to create all of the edges.
  var vertices = graphToVertexArray(graph);

  // For each vertex, find the destination vertex and add a directed Edge between
  // the two vertices.
  vertices.forEach((vertex) => {

    var stopID = vertex.key;
    var nextStopID = getNextStop(stopSequence, stopID);

    // Check for broken links.
    if (!nextStopID)
      return log(`
        [ERROR] Attempt to get next stop for stopID: '`+stopID+`' has failed.
        Route: '`+route+`'. Please fix sequence and re-model.
      `);

    // Add the edge object.
    graph.addNewEdge(stopID, nextStopID, new Edge(stopID, nextStopID));

  });

  // Once the base graph has been constructed we can return it.
  return graph;

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

    console.log(edge);

    output.push({key: edge.value[0], value: edge.value[1]});

    vertex = edges.next();

  };

  return output;

}

// Utility functions.
function log(message){
  console.log('[graphModel.js] ' + message);
}
