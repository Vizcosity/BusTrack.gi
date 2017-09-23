/**
 *  Dijkstra's shortest path finding algorithm for use with 'js-graph' npm
 *  module.
 *
 *  Acknowledgements: https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm
 */

// Dependencies.
var Graph = require('./graph');

// Set up module.
module.exports = dijkstras;

// Run the algorithm on the graph.
function dijkstras(startNode, endNode, graph, Graph){

  // Create set of unvisitedVertices, or in this case, just another graph.
  // This will be used to represent the set of univisited vertices.
  var unvisitedVertices = new Graph();

  // Distance from source map.
  var distance = {};

  // Loop through all vertices, add the null labels.
  graph.vertices().forEach(vertex => {

    // Create entries.
    distance[vertex.id] = {
      val: Infinity,
      through: startNode
    };

    // Add to the new graph.
    unvisitedVertices.addVertex(vertex.id);

  });

  // Set the source to source distance to 0.
  distance[startNode].val = 0;

  var currentNode = startNode;


  // Continue looping until base case is that the univistedVertices set is empty.
  while (unvisitedVertices.vertices().length !== 0){

    console.log("Current Node: " + currentNode);

    // Get all adjacent nodes from the current node (that the current node directs
    // to).
    Object.keys(getAdjacentVertices(graph, currentNode)).forEach(vertex => {

      // source -> current node distance for ease of reference later.
      var currentNodeDistance = distance[currentNode].val;

      // currentnode -> adjacent vertex edge.
      var currentToAdjacentEdge = graph.getEdge(currentNode, vertex);

      // current node -> adjacent vertex distance for reference later.
      var currentToAdjacentDistance = (currentToAdjacentEdge ? currentToAdjacentEdge.weight : 0);

      // For each adjacent node we consider the total distance from the source
      // or start node, and compare this to the current recorded distance.

      // We need to consider the fact that the new calculated distances
      // will be occuring 'through' the currentNode from which the adjacent
      // nodes are derived from.

      // Get existing distance information.
      var existingDistanceInfo = distance[vertex];

      // The new distance would be startNode -> currentNode + currentNode -> adjacentNode distance.
      var newDistanceInfo = {
        val: currentNodeDistance + currentToAdjacentDistance,
        through: currentNode
      };

      console.log("Existing Distance Info: ");
      console.log(existingDistanceInfo);

      // Compare the two distances and choose to record the shortest.
      if (newDistanceInfo.val < existingDistanceInfo.val)
        distance[vertex] = newDistanceInfo;

      console.log("New distance Info: ");
      console.log(newDistanceInfo);

    });

    // Remove the currentNode from the unvisited set.
    unvisitedVertices.removeVertex(currentNode);

    // After updating all adjacent nodes, get the next nearest node from
    // the current node and set it as the currentNode.
    currentNode = getNearestVertex(graph, currentNode).id;

    // Exit clause: IF the current node is equal to the target node,
    // then we can return.
    if (currentNode === endNode)
      return generatePath(distance, startNode, endNode, graph);


  }

  // If code reaches this point, no path can be found.
  return [];


}

// Generates a path array of vertices based off of the distance object
// (reverse iteration).
function generatePath(distance, startNode, endNode, graph){

  // Output path array.
  var output = [];

  var currentNode = endNode;

  // Add the end node to the start of the path.
  output.push(endNode);

  // Continue looping until we reach the current node.
  while (currentNode !== startNode){

    // Get vertex ID from the distance object.
    var vertexID = distance[currentNode].through;

    // Push the vertex ID to the array.
    output.push(vertexID);

    // Set the 'through' node as the new currentNode.
    currentNode = distance[currentNode].through;

  }

  // Return the array but reversed. (Since we employed a reverse iteration).
  return output.reverse();

}

// Get all vertices that the passed vertex connects to.
function getAdjacentVertices(graph, vertex){

  return graph.getVerticesFrom(vertex);

}

function getNearestVertex(graph, startVertex){

  var nearestVertex = null;

  var connectedVertices = graph.getVerticesFrom(startVertex);

  console.log(connectedVertices);

  // Gets the nearest vertex based off of the weights of the associated edges.
  Object.keys(connectedVertices).forEach(id => {

    var currentVertex = connectedVertices[id];

    if (!nearestVertex) nearestVertex = currentVertex;

    var newEdge = graph.getEdge(startVertex, currentVertex);
    var oldEdge = graph.getEdge(startVertex, nearestVertex);

    // If either edge undefined just skip this iteration.
    if (!newEdge || !oldEdge) return false;

    if (newEdge.weight < oldEdge.weight)
      nearestVertex = currentVertex;

  });

  console.log("Nearest vertex: ");
  console.log(nearestVertex);

  // After the iteration, return the result.
  return (nearestVertex ? nearestVertex.destination : nearestVertex);

}
