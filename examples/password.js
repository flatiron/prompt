/*
 * simple-prompt.js: Simple example of using node-prompt.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var prompt = require('../lib/prompt');

//
// Start the prompt
//
prompt.start();

//
// Get two properties from the user: username and password
//
process.on('uncaughtException',function(e){console.log(e,e.stack)})
prompt.get(['username', { name:'password', hidden: true, validator: function(value, next) {
    setTimeout(next,5000)
  }}], function (err, result) {
  //
  // Log the results.
  //
  console.log('Command-line input received:');
  console.log('  username: ' + result.username);
  console.log('  password: ' + result.password);
});
