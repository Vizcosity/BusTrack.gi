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


// Module Object.
function AnalysisModule(routes, options){

  var graphs = constructGraphs(routes);



}

// Construct graphs for each route passed.
function constructGraphs(routes){

  var output = {};

  routes.forEach((route) => {

    output[route] = new graphModel(route);

  });

  return output;

}
module.exports = AnalysisModule;
