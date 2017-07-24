// Module for parsing information scraped from the site.
module.exports = {

  timeSince : function(string){

    var output = [];

    var parsedValues = timeStringParser(string);

    for (var i = 0; i < parsedValues.length; i++){
      if (parsedValues[i].unit == 'minute') output.push(parsedValues[i].val * 60);
      else if (parsedValues[i].unit == 'second') output.push(parsedValues[i].val);
    }

    return sumVals(output);

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

  // Set index to 0 if it has not been passed.

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
