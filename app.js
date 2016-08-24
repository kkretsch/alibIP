
/**
 * Main server root script
 */


var http = require('http');

var app = require('./application');
var vocabClient = require('./application/xmpp');
vocabClient.initialize(app);


var myPort = process.env.PORT || 3001;
var myInterface = process.env.IFACE || '::1';

http.createServer(app).listen(myPort, myInterface, function(){
  console.log('Express server listening at ' + myInterface + ' on port ' + myPort);
});
