const config = require("../../crawler/config.json");
const abbreviations = (config.abbreviations ? config.abbreviations : {});
const stopnames = (config.stopnames ? config.stopnames : {});

module.exports = function Stop(id){
  this.id = id;
  this.name = (stopnames[id] ? stopnames[id] : "Untitled.");
}
