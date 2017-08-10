/**
 *   Bus Track Gibraltar Backened ver@1.0.0
 *
 *    This is the main entry point, from which all the other module are initialized.
 *
 */


log("Bus Track Gibraltar ver 1.0.0 @ Aaron Baw.");
log("Loading modules...", 'progress');

// Dependencies.
const fork = require('child_process').fork;

const CRAWLER = fork("./crawler/main.js");
log("Crawler running... OK");
log("Data API running... OK");
log("Front end web server running... OK");
log("Analysis module running... OK");

// Error reporting.
CRAWLER.on("close", (code) => {
  if (code !== 0) return log("Crawler exited with code: " + code, "error");
});

// Utility functions.
function log(message, type){

  var resolveType = {
    'info': '[ - ]',
    'error': '[ X ]',
    'progress': '[...]',
    'status': this.progress,
    'warn': '[ ! ]'
  };

  console.log("[BT] " + (type && resolveType[type] ? resolveType[type] : resolveType['info']) + " " + message);
}
