/**
 * [Interface For inserting scrape entries to the DB.]
 *
 *  Aaron Baw @ 2017
 */

// Configure module.
module.exports = crawlerDBInterface;

// Set DB Names.
const liveTableName = 'buses.live';
const logTableName = 'buses.log';

// Determine foreign key columns.
var fks = {
  routeID: 'buses.route_info',
  stopID: 'buses.stop_info'
};

// Module entry point.
function crawlerDBInterface(){

  // Set up DB connection.
  var DB = require('./db.js');
  var db = new DB();

  // Insertion function.
  this.insert = function(entries, callback){

    // If the entries object is empty, return a null / false.
    if (!entries || entries.length === 0) return callback(null);

    // Get query stack to be executed.
    var queries = generateInsertionQueryStack(entries);

    // Execute query stack.
    executeQueryStack(queries, db, callback);



  }

}

// Recursively executes the query stack passed, one by one.
function executeQueryStack(stack, db, callback){

  // Base case: on empty or null stack, return.
  if (!stack || stack.length === 0) return callback();

  // Get current item.
  var ci = stack.shift();

  // Execute the query.
  db.query(ci, (err, data) => {
    // Check for errors.
    if (err) console.log(err);
    // Recursively call parent on callback.
    executeQueryStack(stack, db, callback);
  });

}

// Generates the insertion queries as seperate queries, an array that needs to
// be executed per item.
function generateInsertionQueryStack(entries){

  // Output query stack.
  var output = [];

  // Construct columnNames with the first entry passed.
  var columnNames = generateColumnNames(entries[0]);

  // preQuery.
  output.push(generateLiveFlushQueryString(entries));

  // resetIDSequenceQuery.
  output.push(generateReassignIndecesQueryString(liveTableName));

  output.push(generateInsertionQueryStringComponents(logTableName, columnNames, entries));
  output.push(generateInsertionQueryStringComponents(liveTableName, columnNames, entries));

  // Return query stack / array for execution.
  return output;

}

// Generates the insertion query string for all entries, to be executed as a
// single query.
// Flushes live DB of entries which are part of the route being updated,
// and then reassigns the index values for the id serial primary key.
function generateInsertionQueryString(entries){

  // Preamble: Delete from buses.live for current routes..
  var preQuery = generateLiveFlushQueryString(entries);

  // Construct columnNames with the first entry passed.
  var columnNames = generateColumnNames(entries[0]);

  // Build main query.
  // var mainQuery =
  // `INSERT INTO ${logTableName} (${columnNames.string})
  //   ${generateValueString(entries, columnNames.array)};`;
  var mainQuery = generateInsertionQueryStringComponents(logTableName, columnNames, entries);
  mainQuery += generateInsertionQueryStringComponents(liveTableName, columnNames, entries);

  // Get query string to reset the id serial sequence and assign new ordered
  // int value to rows at the id column. (for cleaning).
  var resetIDSequenceQuery = generateReassignIndecesQueryString(liveTableName);

  // Return the final built query for execution.
  return `${preQuery}\n ${resetIDSequenceQuery}\n ${mainQuery}`;

}

// Generates the 'INSERT INTO' componenets for each entry passed.
function generateInsertionQueryStringComponents(tableName, columnNames, entries){

  var stringedComponents = "";

  entries.forEach(entry => {

    stringedComponents += generateInsertionQueryStringComponent(tableName, columnNames, entry);

  });

  return stringedComponents;

}

// Generates a single 'INSERT INTO' component.
function generateInsertionQueryStringComponent(tableName, columnNames, entry){

  return `INSERT INTO ${tableName} (${columnNames.string}) ${generateValueString(entry, columnNames)};\n`;

}

// Generates the value component for a single insertion string component.
function generateValueString(entry, columnNames){

  var valueString =  "VALUES ";

  // For each entry, concatenate the value component string to the base string.
  valueString += generateValueComponentString(entry, columnNames.array);

  // Return the string.
  return valueString;

}

// Generates value components for a single entry.
function generateValueComponentString(entry, colNames){

  var output = "";

  // Open bracket.
  output += `(`;

  colNames.forEach((column, i) => {

    var terminator = (i !== colNames.length - 1 ? ", " : "");

    // Check to see if column is a foreign key.

    // If column of current value is a fk, then use the proper syntax to
    // get the id ref value for the corresponding value.
    output += (
      fks[column] ?
      `(SELECT id FROM ${fks[column]} WHERE name=${preparePSQLVal(entry[column].toString())})`:
      preparePSQLVal(entry[column])
    );

    // Add on terminator.
    output += terminator;

  });

  // Close bracket.
  output += `)`;

  // Return output;
  return output;

}


// Detects the type of value being passed, and prepares accordingly by
// surrounding in quotes and whatnot.
function preparePSQLVal(val){

  if (getJSType(val) == "Date") return `'${val.toISOString()}'`;

  // Prepare strings by adding quotes and replacing apostrophe's for double single quotes.
  if (getJSType(val) === "String") return `'${val.replace(`'`, `''`)}'`;

  // Otherwise just return the value.
  return val;

}

// Generates query string which clears entries in the live table which are about
// to be re-written.
function generateLiveFlushQueryString(entries){

  // Routes which will be removed from the live DB.
  // Set used to enforce uniqueness.
  var routes = new Set();

  // Add routes to the routes set.
  entries.forEach(entry => {
    routes.add(entry.routeID);
  });

  // Base query.
  var query = "DELETE FROM buses.live WHERE ";

  // Build on base query.
  Array.from(routes).forEach((route, i) => {

    // The route name passed here does not correspond with the PK
    // route ID in the database, this needs to be searched for.s

    // If iterator is on last iteration, insert semicolon.
    // Otherwise this means there are more routes to be added to the string,
    // so they should be added after the placement of the 'OR' keyword.
    var terminator = (i !== routes.size - 1 ? " OR " : ";");

    query += `"routeID"=(SELECT id FROM buses.route_info WHERE name='${route}')` + terminator;

    // Concat route + termiantor to the string.
    // query += `"routeID"=` + `'${route}'` + terminator;

  });

  // Return the query.
  return query;

}

// Generates column names from Object's keys. Returns a string
// as well as an array so that value ordering can be enforced later on.
function generateColumnNames(entry){

  // Set up output object.
  var output = {};
  output.array = [];
  output.string = "";

  // Iterate over keys and build the column names.
  Object.keys(entry).forEach((columnName, i, arr) => {

    // Terminator for end of iteration.
    var terminator = (i !== arr.length - 1 ? ", " : "");

    // Push column name to output array.
    output.array.push(columnName);

    // Concatenate output string.
    output.string += `"${columnName}"` + terminator;

  });

  // Return output object with built column names.
  return output;

}

// Builds a query string which restarts the id serial sequence and assigns
// new id to all entries in the table.
function generateReassignIndecesQueryString(tableName){

  // Add new sequence assignment command to the query.
  var query = `\nALTER SEQUENCE ${tableName}_id_seq RESTART WITH 1;\nUPDATE buses.live SET id=nextval('${tableName}_id_seq');`

  // Return query string.
  return query;

}

// Get the JS datatype of the value passed.
function getJSType(val){

  var string = Object.prototype.toString.call(val);

  var segment = string.split(' ')[1];

  // Parse the segment to omit the trailing ']'.
  return segment.substring(0, segment.length - 1);

}

// Converts object into a kvp array to enforce ordering.
function objectToArray(obj){

  var output = [];

  Object.keys(obj).forEach(key => {
    output.push({key: key, value: obj[key]});
  });

  return output;

}

// Utility: logging.
function log(message){
  console.log("[CRAWLER-DB-INTERFACE] " + message);
}
