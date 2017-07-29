// Module for parsing information scraped from the site.
var config = require('../config.json');

module.exports = {

  // Takes in a string representing time since last stop, converts to raw secs.
  timeSince: function(string){

    var output = [];

    var parsedValues = timeStringParser(string);

    if (!parsedValues) return null; // Signals a timeout;

    for (var i = 0; i < parsedValues.length; i++){
      if (parsedValues[i].unit == 'minute') output.push(parsedValues[i].val * 60);
      else if (parsedValues[i].unit == 'second') output.push(parsedValues[i].val);
    }

    return sumVals(output);

  },

  // Takes in the full string name of the Bus Stop and returns the Abbr. code.
  resolveBusStopName: function(longStringName){

    // Check to see if the abbr. exists in the predfined list, if it does, return it.
      // Reload the JSON first.
      config = require('../config.json');

      if (config && config.abbreviations && config.abbreviations[longStringName])
        return config.abbreviations[longStringName];


    // If not, calculate the below and add it to the JSON file.
      // Calculate the abbreviation.
      var abbreviatedStopName = calcStopAbbreviationName(longStringName);

      // Add it to the config file.
      config.abbreviations[longStringName] = abbreviatedStopName;

      // Update the JSON file.
      require('fs').writeFile('./config.json', JSON.stringify(config, null, 2), function callback(err){
            if (err !== null){console.log(err)};
            log("Added new abbreviation for '"+longStringName+"': '"+abbreviatedStopName+"'");
      });

    // Return an abbr of the first letter of every word in the string.
    return abbreviatedStopName;

  }
}

// Final summing of all 'second' time unit values.
function sumVals(arr){
  var output = 0;
  for (var i = 0; i < arr.length; i++){
    output += arr[i];
  }
  return output;
}


// Parses the timeSince string into a JSON containing Minutes + seconds.
function timeStringParser(string){

  // If contains over an hour ago, return null.
  if (string.indexOf("over an hour ago")!== -1){
    log("Detected timeout. Returning null for time.");
    return null
  };

  // Separate all of the numbers.
  var numbers = getNumbers(string);

  for (var i = 0; i < numbers.length; i++){
    numbers[i].unit = determineTimeUnit(numbers[i].val, numbers[i].remainingString);
  }

  // Numbers should be fully prepared now;
  // JSON object containing the value
  return numbers;

}

function determineTimeUnit(number, string){

  // Save string components as split array and ignore empty array entries.
  var stringComponents = string.split(" ").filter(function(word){return word !== ""});

  var timeUnit = stringComponents[stringComponents.indexOf(number.toString()) + 1];

  if (!timeUnit) return null;

  // If the last character is an 's', cut it off.
  if (timeUnit[timeUnit.length - 1] == "s") timeUnit = timeUnit.substring(0, timeUnit.length - 1);

  // If failed return null.
  return ((timeUnit == "minute" || timeUnit == "second") ? timeUnit : null);

}

function getNumbers(string){

  var numbers = [];

  // If no string passed / empty string then return false.
  if (!string || !string.length) return false;

  for (var i = 0; i < string.length; i++){
    if (isNumber(string[i]) && !isNumber(string[i - 1]))
      numbers.push({
        val: getNumber(string, i),
        index: i,
        remainingString: string.substring(i, string.length)
      });
  }

  return (numbers.length !== 0 ? numbers : false);

}


function getNumber(string, startIndex){

  var numString = "";

  for (var i = startIndex; i < string.length; i++){
    if (!isNumber(string[i])) break;
    numString += string[i];
  }

  // If the final numString is not empty, parse as int and return.
  return (numString !== "" ? parseInt(numString) : 0);

}

// Works for single characters only.
function isNumber(char){
  return !isNaN(parseInt(char));
}

function calcStopAbbreviationName(longString){

  var abbr = "";

  var words =  longString.split(" ");

  for (var i = 0; i < words.length; i++){

    if (words[i][0] == "(") {
      abbr += words[i][0] + words[i][1] + ")";
      continue;
    }

    abbr += words[i][0];
  }

  return abbr;

}

function log(message){
  console.log("[PARSE.js] " + message);
}
