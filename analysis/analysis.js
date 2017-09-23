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

  log("Constructing graphs.");

  // Construct the graphs for each route.
  var graphs = constructGraphs(routes);

  log("Graphs constructed.");

  // Get the Path and ETA info for the journey specified.
  this.getPath = function(routeID, sourceStop, destStop, prop){

    log("Getting path from: " + sourceStop + " to: " + destStop);

    // Reference to the graph being used for the current route.
    var graph = graphs[routeID].graph;

    // If not specified, we use the daily ETA avg by default.
    var etaAvgPeriod = (prop && prop.etaAvgPeriod ? prop.etaAvgPeriod : 'day');

    // Check if there exists a path between the two stops before calculating the ETA.
    if (!graph.hasPath(sourceStop, destStop)) return log("No path for stops entered.");

    // Get the path array.
    var path = graph.getShortestPath(sourceStop, destStop);

    // Get ETA of whole path.
    var pathETA = getPathETA(graph, path, etaAvgPeriod);

    // After the while loop terminates we have the ETA and the path.
    return {
      source: sourceStop,
      destination: destStop,
      ETA: pathETA,
      path: path
    };

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

// Calcuates the ETA for a passed path.
function getPathETA(graph, path, etaAvgPeriod){

  // This will hold the total ETA of the path and will be summed upon.
  var ETASum = 0;

  // If the path length is less than or equal to one, there can be no
  // edges and as such the ETA must be 0 because there is no path, or the
  // only entry in the path is a single stop, and as such there cannot be an ETA.
  if (path.length <= 1) return 0;

  // Loop through each item and get the edge between the current vertex and the next.
  path.forEach((vertex, i) => {

    // Skip the last element.
    if (i === path.length - 1 || !vertex) return false;

    // Get the edge value.
    var edge = graph.getEdge(vertex, path[i + 1]);

    console.log(vertex + " --> " + path[i + 1]);

    console.log(edge);

    if (!edge) return false;

    // Get the ETA Sum.
    var ETA = edge.getETA(etaAvgPeriod);

    // Add ETA to the ETASum.
    ETASum += ETA;

  });

  // Return the ETA Sum.
  return ETASum;

}

function log(message){
  console.log("[BusTracK | analysis] " + message);
}



module.exports = AnalysisModule;
