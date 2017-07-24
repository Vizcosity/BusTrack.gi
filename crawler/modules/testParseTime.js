var parse = require('./parse.js');

var arg = process.argv[2];

console.log(parse.timeSince((arg ? arg : '1 minute  and 23 seconds ago')));
