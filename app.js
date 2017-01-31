
/**
 * Main server root script
 */

"use strict";

var http = require('http');

var app = require('./application');


var myPort = process.env.PORT || 3003;
var myInterface = process.env.IFACE || '::1';


http.createServer(app).listen(myPort, myInterface, function(){
  console.log('Express server listening at ' + myInterface + ' on port ' + myPort);
});
