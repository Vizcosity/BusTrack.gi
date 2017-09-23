
const DB = require('../db/db');

var db = new DB();

// Get stop info.
var abbreviation = require('../crawler/config').abbreviations;

var queryStack = [];

Object.keys(abbreviation).forEach(name => {

  var query = `INSERT INTO buses.stop_info (name, abbreviation) VALUES('`+name.replace("'", "''")+`', '`+abbreviation[name].replace("'", "''")+`')`;

  queryStack.push(query);

})

addAllToDb(queryStack, () => console.log("Done"));

function addAllToDb(stack, cb){

  if (!stack || stack.length === 0) return cb();

  var ci = stack.shift();

  console.log(ci);

  db.query(ci, () => addAllToDb(stack, cb));

}
