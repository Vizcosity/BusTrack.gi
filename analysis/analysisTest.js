var analysisModule = require('./analysis.js');

var routeData = new analysisModule([3]);

console.log("Analysis module set up.");

console.log(routeData.getPath(3, 'BCH', 'MHE'));
