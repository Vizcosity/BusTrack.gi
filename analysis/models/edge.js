/**
 *   The Edge object holds key information about the distance between
 *   different nodes, and holds an intrinsic notion of adjacent node 'weight'.
 *
 *   The benefit of modelling the graph as such would allow for the utilization
 *   of shortest-path finding algorithms which depend on having weights between
 *   nodes.
 *
 */

// DEPENDENCIES
const moment = require('moment');

// Export module.
module.exports = Edge;

/**
 * [Object to be inserted with an Edge on the Directed Graph modelling bus routes.]
 */
function Edge(sourceStop, destStop, prop){

  // Reference to own instance for calling within another function later.
  var self = this;

  // Static properties / variables:
  this.distance = (prop && prop.distance ? prop.distance : null);

  // Information about the source end dest stops.
  this.source = sourceStop;
  this.destination = destStop;

  // ETA object.
  this.ETA = {
    current: null,
    log: [],
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

  };

  // By default we will set the default weight of the edge
  // object to be the hourly eta average.
  // This can of course be changed.
  this.weight = this.ETA.avg.hour;

  // Utility functions for the object.

  /**
   * Adds a new ETA object to the Edge.
   * @param  {Date} earlyDate  [Earlier Date Object]
   * @param  {Date} lateDate   [Later Date Object]
   * @param  {Boolean} reCalcBool [Should function recalculate Averages?]
   */
  this.addETA = function(earlyDate, lateDate, reCalcBool){

    var ETAval = calculateETA(earlyDate, lateDate);
    var medianDate = getMedianDate(earlyDate, lateDate);

    var latestETA = new ETA(ETAval, medianDate);

    // Set current ETA to most recently calculated.
    this.ETA.current = latestETA;

    // Push calculated ETA to the array.
    this.ETA.log.push(this.ETA.current);

    // Finally, if reCalcBool == true, we need to recalculate the avgs.
    if (reCalcBool) self.recalculateETAs();

  }

  /**
   * [Recalculates ETAs for all of the active average periods.]
   */
  this.recalculateETAs = function(){

    var ETAs = {};

    // Select time periods from 'avg-active' property. They can be disabled here.
    var periods = Object.keys(self.ETA.active).filter((period) => {
      return self.ETA['avg-active'][period];
    });

    // Set up arrays for each period.
    periods.forEach((period) => {

      if (!ETAs[period]) ETAs[period] = [];

    });

    // Loop through all Logged ETAs
    self.ETA.log.forEach((eta) => {

      // If no date or no eta, skip current iteration (invalid data).
      if (!eta || !eta.val || !eta.date) return false;

      // Parse date as a moment object.
      var etaMoment = moment(eta.date);

      // For each defined period of time, we need to grab all of the ETAs for that
      // period.
      periods.forEach((period) => {

        // If the eta is within the period specified, push it to the ETA array
        // for that period type.
        if (withinPeriod(etaMoment, period))
          ETAs[period].push(eta);

      });

    });

    // Now the ETAs object should contain all ETAs sorted by period.
    // We can now caclulate averages and update.
    periods.forEach((period) => {

      self.ETA.avg[period] = calculateAvgETA(ETAs[period]);

    });

  }

}

// UTILITY FUNCTIONS / OBJECT DEFINITIONS

// ETA Object.
function ETA(eta, date){

    // Stores the value of the ETA in seconds as well as the median date
    // of the two dates used to calculate the ETA.
    this.val = eta;
    this.date = date;

}

// Takes in two dates, returns difference in seconds.
function calculateETA(earlyDate, lateDate){
  return ((lateDate - earlyDate) / 1000);
}

// Calculates the mid-point of the two dates given.
function getMedianDate(date1, date2){
  return new Date( (  (date1.getTime() + date2.getTime())  / 2) );
}

// Checks to see if passed date is within valid period.
function withinPeriod(moment, period){

  return moment().isBetween(moment().startOf(period), moement().endOf(period));

}

// Calculates the average ETA for the array of ETAs passed.
function calculateAvgETA(etaArray){

  var sum = 0;

  etaArray.forEach((eta) => {

    sum += (eta.val ? eta.val : 0);

  });

  return (sum / etaArray.length);

}
