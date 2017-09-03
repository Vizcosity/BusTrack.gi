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
var graphModel = require('./models/graphModel.js');

// Config.
var _RECALCPERIOD, _ETATYPE;

// Module Object.
function AnalysisModule(routes, options){

  // Options for periodic recalculation.
  if (options && options.recalcperiod) _RECALCPERIOD = options.recalcperiod;

  // Construct the graphs for each route.
  var graphs = constructGraphs(routes);

  // Get the Path and ETA info for the journey specified.
  this.getPath = function(routeID, sourceStop, destStop, prop){

    // Reference to the graph being used for the current route.
    var graph = graphs[routeID].graph;

    // The path / sequence of nodes desired for the journey from sourceStop
    // to destStop.
    var path = [];

    // If not specified, we use the daily ETA avg by default.
    var etaAvgPeriod = (prop && prop.etaAvgPeriod ? prop.etaAvgPeriod : 'day');

    // Check if there exists a path between the two stops before calculating the ETA.
    if (!graph.hasPath(sourceStop, destStop)) return log("No path for stops entered.");

    var ETASum = 0;

    // Create node variables for the current node.
    var prevNode = graph.vertexValue(sourceStop);
    var currentNode = prevNode;

    // Push the origin node to the path.
    path.push(prevNode);

    // Traverse graph from sourceStop until destStop is reached.
    while(currentNode.stop !== destStop){

      // Set prev node to the current node.
      prevNode = currentNode;

      // Get the next node.
      currentNode = currentNode.next;

      // Push current node to path array.
      path.push(currentNode);

      // Save next edge and eta value to variables.
      var currentEdge = graph.edgeValue(prevNode.stop, currentNode.stop);
      var currentETA  = currentEdge.getETA(etaAvgPeriod);

      if (!currentETA) {console.log("No eta for edge: "); console.log(currentEdge);}

      // Add ETA between prevNode & currentNode to the running ETA sum total.
      ETASum += currentETA;

    }

    // After the while loop terminates we have the ETA and the path.
    return {
      source: sourceStop,
      destination: destStop,
      ETA: ETASum,
      path: path
    }

  }


}

// Construct graphs for each route passed.
function constructGraphs(routes){

  // Output graphs.
  var output = {};

  routes.forEach((route) => {

    output[route] = new graphModel(route);

    // For each edge, we then calculate the ETAs of the two nodes
    // which are connected by the edge. Grab their values, and find the
    // latest entries, then pop into the nifty edge calculate / add eta function.

  });

  return output;

}

// Finds the shortest path between two nodes.
function findShortestPath(nodeOne, nodeTwo){



}



module.exports = AnalysisModule;
