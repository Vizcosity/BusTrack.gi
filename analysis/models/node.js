/**
 *  Graph Node stores information about the Stop as well as a history of arrivals
 *  which have taken place for a specific route, and the date stamps of these
 *  arrivals.
 *
 *  Uses a stack-like Object to keep track of processed and unprocessed log
 *  entries, with a few utility functions to make things easier.
 *
 */

// DEPENDENCIES
const moment = require('moment');


// Get the scrape Interval in order to allow for proper sorting of entries.
// We will double it just for safety.
const _SCRAPEINTERVAL = (require('../../crawler/config.json')['crawlInterval'] * 2);

// Node Object Contructor.
function Node(stop, prevNode, nextNode){

  // Reference to the object instance to be used in utility functions.
  var self = this;

  // Stop object which holds information such as the stopID and other meta.
  this.stop = stop;

  // Information about the previous node that links to this one,
  // and the next node which this connects to.
  this.previous = (prevNode ? prevNode : null);
  this.next = (nextNode ? nextNode : null);

  // Links to next and previous nodes. This takes into account the preceeding
  // node just before this one to determine the real next node value, since
  // we can have routes where two different nodes may link to the same node
  // perhaps in a different direction, and so we need to take into account
  // previous (or preceeding) node values when determining the next node
  // in the graph sequence.
  this.link = [];

  // The log object will hold the information of all the logged arrivals for
  // buses on this route for this specific stop, and the time at which the arrival
  // took place.
  this.log = {

    // Logs are split into different categories, depending on the Edge weight
    // calculation, either the most recent departure or the most recent arrival
    // may need to be selected.
    //
    // We also store information about the duration kept at each stop which
    // could be of use for calculating route times by also taking this into
    // account.
    arrival: {
      unprocessed: [],
      processed: [],
      all: []
    },

    departure: {
      unprocessed: [],
      processed: [],
      all: []
    },

    // Entries which are at the stop, but neither an arrival, or a departure.
    // Contains information about the duration spent at each stop.
    // Entries here should solely consist of durations that the buses have spent
    // at each respective stop.
    atStop: {

      all: [],
      current: null,

      avg: {
        "hour": null,
        "day": null,
        "week": null,
        "month": null,
        "year": null
      },

      "active-avg": {
        "hour": true,
        "day": true,
        "week": true,
        "month": true,
        "year": true
      }
    },

    // All new entries get added here, then they are each sorted into either
    // 'arrival', 'departure' or 'atStop' by reoccurring function.
    unsorted: [],
    all: []

  };

  // Node Object Utility functions.
  this.addEntry = function(entry, options){

    // We need to create a date property, seperate from the logdate,
    // which is a computed property which takes into accoun the ping interval.
    entry.date = moment(entry.logdate.setSeconds(entry.logdate.getSeconds() - (entry.interval / 1000)));

    // Add the entry to the right places.
    self.log.all.push(entry);
    self.log.unsorted.push(entry);

    // Sort & process if desired.
    if (options && options.sort) self.sortEntries();
    if (options && options.recalculateAtStopAvgs) self.recalculateAtStopAvgs();

  };

  // Each stop entry is taken at most 30 seconds apart, if we see that we have
  // distinct entries which differ from each other greater than this, then we
  this.sortEntries = function(){

    // Save entries to a variable.
    var entries = self.log.unsorted;

    // Split up all the entries into 'blocks' that can be sorted
    // for arrival, departure and atStop.
    var sortBlocks = getSortBlocks(entries);

    // For each block that we recieve, we need to split it up in terms of
    // the first entry, the last entry, and then fill in the required
    // sections.

    sortBlocks.forEach((sortBlock) => {

      // The first entry undoubtedly will be the arrival item.
      // Shift the array so that we might as well remove the item
      // since it won't be needed anymore. (Avoids confusion).
      var arrivalItem = sortBlock.shift();

      // To add the item, we add to both 'unprocessed', and 'all'.
      self.log.arrival.unprocessed.push(arrivalItem);
      self.log.arrival.all.push(arrivalItem);

      // Find the first entry in the sort block which is not 'at stop',
      // this is the departure time.
      var departureItem = getDepartureItemFromSortBlock(sortBlock);

      // If departureItem false, could not find so we skip the sort block.
      if (!departureItem) {
        // console.log("invalid dept item. skipping.");
        return false;
      }


      // Push the departure item to it's respective arrays.
      self.log.departure.unprocessed.push(departureItem);
      self.log.departure.all.push(departureItem);

      // Now that we have the arrival and departure time for the given
      // sortBlock, we can calculate the time spent at the stop.
      var atStopEntry = new AtStopObject(arrivalItem, departureItem);

      // Once we have the atStop duration, we can push it to the correct array(s).
      self.log.atStop.all.push(atStopEntry);


    });

    // Now that each sortBlock has been processed, we can remove the
    // items from the self.log.unsorted array.
    // Calculate array difference and thne reassign the remainders to the array.
    self.log.unsorted = arrayDifference(self.log.unsorted, sortBlocks);

    // And we are done!

  };

  // Recalculates all the averages for the atStop duration entries.
  this.recalculateAtStopAvgs = function(){

    var AVGs = {};

    // Select time periods from 'avg-active' property. They can be disabled here.
    var periods = Object.keys(self.log.atStop.avg).filter((period) => {
      return self.log.atStop['active-avg'][period];
    });

    // Set up arrays for each period.
    periods.forEach((period) => {

      if (!AVGs[period]) AVGs[period] = [];

    });

    // Loop through all Logged AVGs
    self.log.atStop.all.forEach((entry) => {

      // If no date or no eta, skip current iteration (invalid data).
      if (!entry || !entry.duration || !entry.date) return false;

      // Parse date as a moment object.
      var avgMoment = moment(entry.date);

      // For each defined period of time, we need to grab all of the ETAs for that
      // period.
      periods.forEach((period) => {

        // If the eta is within the period specified, push it to the ETA array
        // for that period type.
        if (withinPeriod(avgMoment, period))
          AVGs[period].push(entry);

      });

    });

    // Now the ETAs object should contain all ETAs sorted by period.
    // We can now caclulate averages and update.
    periods.forEach((period) => {

      self.log.atStop.avg[period] = calculateAvg(AVGs[period]);

    });

    // And we are done!

  };

  // Utiltiy funciton which packages sorting + processing into one function.
  // Sorts entries + recalculates all averages.
  this.processEntries = function(){

    self.sortEntries();

    self.recalculateAtStopAvgs();

  }

  // Set the previous or next connected node. (Origin / Source).
  this.linkNode(preceedingNode, succeedingNode){

    // Check to see if the link already exists.
    // If the link does exist, return prematurely.
    self.link.forEach(link => {

      if (
          link.preceeding.stop === preceedingNode.stop
          &&
          link.succeedingNode.stop === succeedingNode.stop
        ) return log("Link already exists");

    });

    // Push to the link array.
    self.link.push({
      preceeding: preceedingNode,
      succeeding: succeedingNode
    });

  };

  // Get the next node in the sequence. Takes in the preceeding node.
  this.getNextNode(preceedingNode){

    // Resolve node object into a string stop id if it is not already.
    var preceedingNodeID = (typeof preceedingNode === "string" ? preceedingNode : preceedingNode.stop);

    // Ability to use function without entering the preceedingNodeID if there
    // is just a single node that is linked (should be most cases)
    if (!preceedingNodeID && self.link.length > 0)
      return log(
        `Error: Cannot get next node without preceeding
        node id since more than a single node is linked.`
      );

    // If no preceedingNodeID passed we can assume that at this point in the
    // code execution there is only one link so it should be safe to return
    // the first item in the array.
    if (!preceedingNodeID) return self.link[0].succeeding;

    // PreceedingNodeID should be required at this point.
    self.link.forEach(link => {

      // Check to see if the ID matches any of the linked nodes for preceeding
      // nodes. If it does, return the associated linked node.
      if (link.preceedingNode.stop === preceedingNodeID)
        return link.succeedingNode;

    });

    // Code execution reaches this point if no link is found for the given
    // preceedingNodeID.
    return
      log("Error: No next linked node found for preceedingNodeID: " + preceedingNodeID);

  };

  // Get the previous node given a succeeding stop id in the route sequence.
  this.getPreviousNode(succeedingNode){

    // Resolve the node object into a stop id string if it is not already.
    var succeedingNodeID = (typeof succeedingNode === "string" ? succeedingNode : succeedingNode.stop);

    // Ability to use function without entering the preceedingNodeID if there
    // is just a single node that is linked (should be most cases)
    if (!succeedingNodeID && self.link.length > 0)
      return log(
        `Error: Cannot get prev node without succeeding
        node id since more than a single node is linked.`
      );

    // If no succeedingNodeID passed we can assume that at this point in the
    // code execution there is only one link so it should be safe to return
    // the first item in the array.
    if (!succeedingNodeID) return self.link[0].succeeding;

    // PreceedingNodeID should be required at this point.
    self.link.forEach(link => {

      // Check to see if the ID matches any of the linked nodes for preceeding
      // nodes. If it does, return the associated linked node.
      if (link.succeedingNode.stop === succeedingNodeID)
        return link.preceedingNode;

    });

    // Code execution reaches this point if no link is found for the given
    // preceedingNodeID.
    return
      log("Error: No next linked node found for succeedingNodeID: " + succeedingNodeID);


  }

  // This is used for the calculation of Edge ETA properties.

  // Fetches the most recent arrival time and pops it from the unprocessed array
  // stack. Returns this object, along with a method which removes it from the
  // unprocessed array, and unshifts to the processed array (adds to beginning)
  // if it is choosed to be processed.
  this.mostRecentArrival = function(){

    // If the unprocessed arrival log empty, return false.
    if (self.log.arrival.unprocessed.length === 0) return false;

    // Get the most recent addittion to the array.
    var arrivalItem = self.log.arrival.unprocessed[self.log.arrival.unprocessed.length - 1];

    // Attach the method which allows for popping.
    arrivalItem.pop = function(){

      // Save the item to a variable so that it can also be returned on pop.
      var itemToPop = self.log.arrival.unprocessed[self.log.arrival.unprocessed.length - 1];

      // Remove this item from the 'unprocessed' array, then add it to the
      // beginning of the processed array.
      // We need to pop + unshift to preserve the original ordering of the
      // elements as they were added.
      self.log.arrival.processed.unshift(self.log.arrival.unprocessed.pop());

      // Return the popped item in case it needs to be used.
      return itemToPop;

    }

    // Return the object with the contained pop utility method.
    return arrivalItem;

  }

  // Fetches the most recent departure time and pops it from the unprocessed array
  // stack. Returns this object, along with a method which removes it from the
  // unprocessed array, and unshifts to the processed array (adds to beginning)
  // if it is choosed to be processed. Same as the arrivals.
  this.mostRecentDeparture = function(){

    // If the unprocessed departure log empty, return false.
    if (self.log.departure.unprocessed.length === 0) return false;

    // Get the most recent addittion to the array.
    var departureItem = self.log.departure.unprocessed[self.log.departure.unprocessed.length - 1];

    // Attach the method which allows for popping.
    departureItem.pop = function(){

      // Remove this item from the 'unprocessed' array, then add it to the
      // beginning of the processed array.
      // We need to pop + unshift to preserve the original ordering of the
      // elements as they were added.
      self.log.departure.processed.unshift(self.log.departure.unprocessed.pop());

    }

    // Return the object with the contained pop utility method.
    return departureItem;

  }

  // This will be used to iterate through arrivals and find matching date pairs.
  this.UnprocessedArrivalsIterator = function(){

    // Reference to this for nested this functions.
    var nestedSelf = this;

    var array = self.log.arrival.unprocessed;
    var i = 0;

    this.next = function(){

      // If there is a next item, return it, false otherwise.
      return (nestedSelf.hasNext() ?
        attachEntryMethods(array[i++], {
          unprocessed: self.log.arrival.unprocessed,
          processed: self.log.arrival.processed
        }, i)
      : false);

    }

    this.hasNext = function(){

      // If the next array item is not defined, then return true, false otherwise.
      return typeof array[i + 1] !== 'undefined';

    }


  }

  // Returns iterator for unprocessed departures used for date matching.
  this.UnprocessedDeparturesIterator = function(){

    // Reference to this for nested this functions.
    var nestedSelf = this;

    var array = self.log.departure.unprocessed;
    var i = 0;

    // Return the next item in the Iterator.
    this.next = function(){

      // If there is a next item, return it, false otherwise.
      return (nestedSelf.hasNext() ?
        attachEntryMethods(array[i++], {
          unprocessed: self.log.departure.unprocessed,
          processed: self.log.departure.processed
        }, i)
      : false);

    }

    // Get the current item being iterated, without actually iterating further.
    this.current = function(){

      // Return the current item with attached methods.
      return attachArrivalMethods(array[i], {
        unprocessed: self.log.departures.unprocessed,
        processed: self.log.departures.processed
      }, i);

    }

    // Boolean which detrermines if the Iterator has a following value.
    this.hasNext = function(){

      // If the next array item is not defined, then return true, false otherwise.
      return typeof array[i + 1] !== 'undefined';

    }


  }

  // Return array of processed arrivals.
  this.processedArrivals = function(){

    return self.log.arrivals.processed;

  }

  // Return unprocessed departures for date matching.
  this.unprocessedDepartures = function(){

    return self.log.departures.unprocessed;

  }

  // Return processed departures.
  this.processedDepartures = function(){

    return self.log.departures.processed;

  }

}

// OBJECTS

function attachEntryMethods(item, arrays, index){

  // Pop function which removes from unprocessed and places in processed.
  item.process = function(){

    // Add the item to the beginning of the processed array.
    arrays.processed.unshift(item)

    // Return the popped item in case it needs to be used, while removing it
    // from the unprocessed array at the same time.
    return arrays.unprocessed.splice(index, 1);

  }

  // Return back the item with attached method(s);
  return item;

}

function AtStopObject(arrivalItem, departureItem){

  // console.log(arrivalItem);
  //
  // console.log(departureItem);

  // Set the duration.
  this.duration = calculateAtStopDuration(arrivalItem.date, departureItem.date);

  // Set arrival and departure dates.
  this.arrivalDate = arrivalItem.date;
  this.departureDate = departureItem.date;

  // We will set the 'date' as the median of the two dates. (arrival + departure).
  this.date = getMedianDate(arrivalItem.date, departureItem.date);

}

// Utility functions

// Returns a boolean determining whether the date lies within the period specified.
function withinPeriod(date, period){

  // The Moment.js lib re-sets the date object when .startOf / .endOf method
  // is invoked, so we need to save as new dates before we run the query.
  var original = moment(date);
  var startPeriod = moment(date.startOf(period));
  var endPeriod = moment(date.endOf(period));

  // Run the test.
  var bool = original.isBetween(startPeriod, endPeriod);

  // Return the boolean.
  return bool;

}

// Calculates the mid-point of the two dates given.
function getMedianDate(date1, date2){
  return moment(  (date1 + date2)  / 2 );
}

// Splits up all the entries into blocks of where the bus should be at a stop,
// from here returns array of arrays which can be handled individually.
function getSortBlocks(entries){

  // Output array with the sort blocks contained.
  // (is an array of arrays)
  var output = [];

  for (var i = 0; i < entries.length; i++){

    // Get the next and previous entries.
    var previous = (i !== 0 ? entries[i - 1] : null);
    var next = (i !== (entries.length - 1) ? entries[i + 1] : null);
    var current = entries[i];

    // We dont want to deal with the first & last entries, too little
    // preceeding / succeeding information to sort properly.
    if (!previous || !next) continue;

    // Check to see if the time difference exceeds the _SCRAPEINTERVAL
    if (current.date - previous.date > _SCRAPEINTERVAL) {

      // Save block to a variable.
      var sortBlock = fetchSortBlock(entries, i);

      // Check to see if the output of the sortblock fetcher is valid,
      // if it is not valid, then we skip the current iteration.
      if (!sortBlock) continue;

      // If the above check doesn't fail, then we can push to the array.
      output.push(sortBlock.block);

      // Set 'i' to the index returned by fetchSortBlock.
      i = sortBlock.index;

    }

  }

  // console.log(output);

  // Return output at the end of the for loop.
  return output;

}

// Calculates the mean for an array of atStop duration objects.
function calculateAvg(entries){

  var sum = 0;

  entries.forEach((entry) => {

    sum += entry.duration;

  });

  // Once all of the durations have been summed, we can calculate the mean.
  var mean = (sum / entries.length);

  // if (mean < 0) console.log(entries);

  // Return the result.
  return mean;

}

// Calculates the time (duration) between two dates in MS.
function calculateAtStopDuration(arrival, departure){

  // Return the differnece between the two dates.
  return departure - arrival;

}

// Gets the departure time from a passed sort block.
// (First item in a while where atStop = false).
function getDepartureItemFromSortBlock(entries){

  // Agnostic approach; either finds first atstop = false item,
  // or the previous entry to which entry date difference exceeds
  // scrape interval, otherwise the last item at the stop is returned.
  for (var i = 0; i < entries.length; i++){

    // Get the next and previous entries.
    var previous = (i !== 0 ? entries[i - 1] : null);
    var next = ((i+1) < entries.length ? entries[i+1] : null);
    var current = entries[i];

    // We dont want to deal with the first & last entries, too little
    // preceeding / succeeding information to sort properly.
    if (!previous || !next) continue;

    // console.log(current.date - previous.date);

    // As soon as we find the first non atStop(true) log entry,
    // we need to return this.
    if (current.atStop == false) return current;

    // console.log(current);

    // Check to see if the time difference exceeds the _SCRAPEINTERVAL
    if ((current.date - previous.date) > (_SCRAPEINTERVAL)) return previous;

  }

  // If we reach this point in code execution,
  // we cannot find a valid departure date and so
  // the entire block must be invalid.
  // return false

  return entries[entries.length - 1];

}

// Continuously adds to current sort block
function fetchSortBlock(entries, index){

  // Save the output sort block as an array.
  // The first item in the array should be the entry at the index
  // at which this method was called.
  var outputSortBlock = [entries[index]];

  // Edge case: if this is the last entry, we need to return false.
  // (not enough information)
  if (!entries[index + 1]) return false;

  for (var i = (index + 1); i < entries.length; i++){

    // Get the next and previous entries.
    var previous = (i !== 0 ? entries[i - 1] : null);
    var next = (i !== (entries.length - 1) ? entries[i + 1] : null);
    var current = entries[i];

    // We dont want to deal with the first & last entries, too little
    // preceeding / succeeding information to sort properly.
    if (!previous || !next) continue;

    // if (entries[i].atstop == false) {
    //   console.log("FOUND ONE MARTY!");
    //   console.log(entries[i]);
    // }

    // If the current entry is within the scrape interval of the last,
    // (previous), then we add it to the outputSortBlock, otherwise, break
    // the loop.
    if (current.date - previous.date > _SCRAPEINTERVAL) return {
      block: outputSortBlock,
      index: i
    };

    // Push current entry to the outputSortBlock.
    outputSortBlock.push(current);

  }

  // If code reaches this point, then we disregard the block
  // because it hasn't termianted properly (not delimited by a > _SCRAPEINTERVAL)
  return false;

}

// Calculate difference between two arrays, to move sorted entries.
function arrayDifference(main, toTakeAway){



  var output = [];

  main.forEach((item) => {

    // If the toTakeAway item does not contain the current item,
    // we then push it to the output array.
    if (!contains(toTakeAway, item)) output.push(item);

  });

  return output;

}

// Utiltiy method mainly used for arrayDifference above.
function contains(array, item){
  return array.indexOf(item) !== -1;
}

module.exports = Node;
