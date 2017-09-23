/**
 *  Fetches entries from the database and organizes them by route by pageDate,
 *  essentially individual 'scrapes' that have been entered into the DB.
 *
 *  This will be fed into the chain builder module to start constructing chain
 *  sequences.
 *
 *  Aaron Baw @ 2017
 */

// Dependencies.
const DBInt = require('../../../data-interface/data-interface-main');
const db = new DBInt('buses.log');

// Define module.
module.exports = scrapeBlockSequence;

// Main entry point.
function scrapeBlockSequence(routeID, callback){

  // Block Map -> Reference scrape blocks by their ping date.
  var blockMap = {};

  // Fetch all the entries for a given route.
  db.getBusesOnRoute(routeID, (data) => {

    // Once we have the data, we can go through each item and start building our
    // block.
    //
    // We want to group each item in terms of the page date.

  });

}

// Takes in a DB row and converts to a scrape block,
// based off of the original data entry object.
function ScrapeBlock(row){



}
