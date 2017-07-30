function crawlerDBInterface(){

  // Set up DB connection.
  var DB = require('./db.js');
  var db = new DB();

  // Takes in the JSON object, prepares for insertion into the DB.
  this.insert = function(rowObj, cb){

    var route = rowObj.routeID;

    var preparedEntries = prepareRowItems(rowObj);

    if (!preparedEntries) return log("No buses to insert to DB.");

    log("Preparing query Stacks for db insertion.");

    var stoplogQueryStack = [];
    var liveQueryStack = [];

    // Insert clear command for live table.
    liveQueryStack.push("DELETE FROM live * WHERE routeID="+route);

    // For each prepared item, convert to statement to save to stoplog.
    for (var i = 0; i < preparedEntries.length; i++){
      // Prepare for entry into both stoplog and live tables.
      stoplogQueryStack.push(prepareSQLStatement(preparedEntries[i], 'stoplog'));
      liveQueryStack.push(prepareSQLStatement(preparedEntries[i], 'live'));
    }

    // Concatenate both query stacks to be executed.
    var queryStack = stoplogQueryStack.concat(liveQueryStack);

    // Execute all of the queries.
    addToDB(db, queryStack, function(){
      log("Finished adding item block.");
      if (cb) cb();
    });

  }

}

// Recursively execute query stack.
function addToDB(db, statements, callback){

  if (statements.length == 0) {
    return callback();
  };

  var ci = statements.shift();

  // log("ADD: " + ci);

  db.query(ci, () => {
    addToDB(db, statements, callback);
  });

}

// Takes in the row Obj, returns a prepared array of entry Objects.
function prepareRowItems(rowObj){

  // console.log(rowObj.buses);

  var output = [];

  // console.log(rowObj);

  for (var i = 0; i < rowObj.buses.length; i++){


    output.push({
      logdate:  typeof rowObj.logdate === 'string' ? rowObj.logdate : rowObj.logdate.toISOString(),   // Need to convert to ISO format for insertion.
      stopID: rowObj.buses[i].stopID,
      routeID: rowObj.routeID,
      interval: rowObj.buses[i].interval,
      atStop: rowObj.buses[i].atStop,
      rawscrape: rowObj.buses[i].rawscrape
    });

  }

  return output;

}

/// Takes in a prepared Row Item, converts to a ready-to-insert SQL string statement.
function prepareSQLStatement(preparedRowItem, dbName){

  var columnNames = Object.keys(preparedRowItem);

  var stringedColumnNames = "";
  var stringedValues = "";

  // Prepare the string of column names to let postgres know which columns we want.
  for (var i = 0; i < columnNames.length; i++){
    var endInput = (i !== (columnNames.length - 1) ? ", " : "");
    stringedColumnNames += columnNames[i] + endInput;
    stringedValues += prepareSingleValue(preparedRowItem[columnNames[i]]) + endInput;
  }

  var statement = "INSERT INTO "+dbName+"("+stringedColumnNames+") values("+stringedValues+")";

  return statement;

}

// Wraps in quotes if a string.
function prepareSingleValue(val){
  return typeof val === 'string' ?  "'"+removeQuoteChar(val)+"'" : val;
}

// Removes single quote characters to prevent SQL syntax clashing.
function removeQuoteChar(string){
  return string.replace("'", "");
}

module.exports = crawlerDBInterface;

function log(message){
  console.log("[CRAWLER-DB-INTERFACE] " + message);
}
