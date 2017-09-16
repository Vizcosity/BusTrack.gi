/**
 *  Lightweight scraping module built with Cheerio and Requests.
 *
 *  Requests a webpage then returns a jQuery object that can be used to traverse
 *  the DOM or perform data mining.
 *
 *  Author: Aaron Baw @ 2017
 */

// Dependencies.
const request = require('request');
const cheerio = require('cheerio');

// Global Preferences.
var _OPTIONS, _TIMEOUT, _LOGGING;

/**
 * Requests a webpage then returns a jQuery object that can be used to traverse
 * the DOM or perform data mining.
 * @param  {String}   url      [Url to get]
 * @param  {Function} callback [Callback fired with jQuery object]
 */
module.exports = function getWebpage(url, callback, timeout){

  // Set the timeout if passed.
  _TIMEOUT = (timeout ? timeout : 0);

  // Request the URL.
  request.get(url, (err, response, html) => {

    if (err) throw Error(err);

    // Prepare jQuery object.
    var jQueryPage = cheerio.load(html);

    // Send back prepared page with a timeout if passed.
    setTimeout(() => {

      // Return the page through callback.
      return callback(jQueryPage);

    }, _TIMEOUT);
    
  });

}
