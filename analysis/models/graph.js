/**
 *  Custom Graph lib, because all the others are so bad.
 *
 *  Author: Aaron Baw @ 2017.
 */

// Dependencies.
var dijkstras = require('./dijkstras');


module.exports = Graph;

function Graph(){

  // Represent graph with an adjacency list.
  var vertices = {};
  var edges = [];

  // Add unique vertex to the graph.
  this.addVertex = function(string, object){

    if (typeof string !== 'string')
      throw new Error("Please use string as vertex id.");

    if (this.hasVertex(string))
      throw new Error("Vertex ID: " + string + " already exists.");

    // Add to both source and destination adjacency lists since
    // we are adding just the vertex and not necesarily the edge.
    vertices[string] = new Vertex(string, object);

  }

  // Add array of vertices.
  this.addVertices = function(array){

    // Add vertex for each string value passed in the array.
    array.forEach(string => {

      this.addVertex(string);

    })

  }

  // Get a vertex object by the string id.
  this.getVertex = function(string) {

    // Return vertex.
    return vertices[string];

  }

  // Get vertex value / element from the string ID passed.
  this.getVertexValue = function(id){

    // If no vertex return an undefined value.
    if (!this.hasVertex(id)) return;

    return this.getVertex(id).element;

  }

  // Set new value for the vertex. If no vertex for value, create one.
  this.setVertexValue = function(id, element){

    // If no vertex, create one.
    if (!this.hasVertex(id)) return this.addVertex(id, element);

    // Set the new vertex value.
    this.getVertex(id).element = element;

  }

  // Removes a vertex.
  this.removeVertex = function(id){

    if (!this.hasVertex(id)) return;

    if (vertices[id]) delete vertices[id];

    // For each vertex, remove from/to links.
    this.vertices().forEach(vertex => {

      this.getVerticesFrom(vertex).forEach(vertex => {

        if (vertex.id == id) delete vertex;

      });

      this.getVerticesTo(vertex).forEach(vertex => {

        if (vertex.id == id) delete vertex;

      });

    });

  }

  // Returns truthy value determining if the vertex is contained within the
  // graph.
  this.hasVertex = function(string){

    return typeof vertices[string] !== 'undefined';

  }

  // Returns all vertices for traversal.
  this.vertices = function(){

    // Convert to array.
    var output = [];

    Object.keys(vertices).forEach(vertex => {

      output.push(vertices[vertex]);

    });

    return output;

  }

  // Gets all vertices connected from a passed vertex.
  this.getVerticesFrom = function(vertex){

    // No vertices connected in this case.
    if (!this.hasVertex(vertex)) return [];

    return this.getVertex(vertex).verticesFrom;

  }

  // Gets al vertices which connect to a passed vertex.
  this.getVerticesTo = function(vertex){

    // No vertices connected in this case.
    if (!this.hasVertex(vertex)) return [];

    return this.getVertex(vertex).verticesTo;

  }

  // Add an edge.
  this.addEdge = function(source, dest, element){

    // Check to see that both vertices are contained.
    if (!this.hasVertex(source) || !this.hasVertex(dest))
      throw new Error("One or more vertices not defined.");

    // Add dest to source vertex.
    this.getVertex(source).verticesFrom[dest] = new Edge(this.getVertex(dest), element);

    // Add source to dest.
    this.getVertex(dest).verticesTo[source] = new Edge(this.getVertex(source), element);

  }

  // Get an edge value given a source and a destination node.
  this.getEdge = function(source, dest){

    // Replace vertex objects with their corresponding ID's if that is what
    // is passed to the method.
    if (typeof source !== 'string' && source.id) source = source.id;
    if (typeof dest !== 'string' && dest.id) dest = dest.id;

    // Check to see that edge exists first.
    if (!this.hasEdge(source, dest)) return;

    // Return the edge value.
    return this.getVertex(source).verticesFrom[dest].element;

  }

  // Alias for get Edge.
  this.getEdgeValue = this.getEdge;

  // Check to see if an edge exists.
  this.hasEdge = function(source, dest){

    var sourceExists = this.hasVertex(source);
    var destExists = this.hasVertex(dest);

    return typeof this.getVertex(source).verticesFrom[dest] !== 'undefined';

  }

  // Set new edge value.
  this.setEdgeValue = function(source, dest, element){

    // Agnositc: if no vertex, create, if no edge, create.
    if (!this.hasVertex(source)) this.addVertex(source);
    if (!this.hasVertex(dest)) this.addVertex(dest);
    if (!this.hasEdge(source, dest)) return this.addEdge(source, dest, element);

    // Otherwise, we update the existing element.
    this.getEdge(source, dest).element = element;

  }

  // Returns all edges.
  this.edges = function(){

    var output = [];

    this.vertices().forEach(vertexObj => {

      var verticesTo = vertexObj.verticesTo;
      var verticesFrom = vertexObj.verticesFrom;

      Object.keys(verticesTo).forEach(key => {

        var edge = verticesTo[key];

        output.push({
          source: vertexObj,
          dest: edge.vertex,
          element: edge.element
        });

      });

      Object.keys(verticesFrom).forEach(key => {

        var edge = verticesFrom[key];

        output.push({
          source: edge.vertex,
          dest: vertexObj,
          element: edge.element
        });

      });

    });

    // Return output.
    return output;

  }

  // Path finding methods.
  this.getShortestPath = function(startNode, endNode){

    // Get vertex string id's if that is not what has been passed.
    startNode = (typeof startNode === 'string' ? startNode : startNode.id);
    endNode = (typeof endNode === 'string' ? endNode : endNode.id);

    // Check to see if nodes exist.
    if (!this.hasVertex(startNode) || !this.hasVertex(endNode)) return [];

    // Get the path using Dijkstra's algorithm.
    return dijkstras(startNode, endNode, this, Graph);

  }

  // Check if there is a path.
  this.hasPath = function(startNode, endNode){

    // Check to see if returned path array is not empty.
    return this.getShortestPath(startNode, endNode).length !== 0;

  }

}

// Vertex object.
function Vertex(id, element){

  this.id = id;
  this.element = element;
  this.verticesTo = {};
  this.verticesFrom = {};

}

// Edge object.
function Edge(vertex, element){

  this.vertex = vertex;
  this.element = element;

}
