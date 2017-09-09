var Graph = require('./graph');
var graph = new Graph();

var findShortestPath = require('./dijkstras');

graph.addVertices(['MHE', 'EB8', 'SJS', 'CP']);

graph.addEdge('EB8', 'MHE', {weight: 5});
graph.addEdge('MHE', 'SJS', {weight: 2});
graph.addEdge('EB8', 'SJS', {weight: 10});

// console.log(graph.getVertex('EB8'));
// console.log(graph.getEdge('EB8', 'MHE'));
// Run dijkstras to find shortest path from EB8 -> SJS.
// console.log(findShortestPath('EB8', 'SJS', graph, Graph));

console.log(graph.getShortestPath('EB8', 'SJS'));

console.log("Path between EB8 and SJS: "+graph.hasPath('EB8', 'SJS'));
