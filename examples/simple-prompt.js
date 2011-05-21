/*
 * simple-prompt.js: Simple example of using the reprompt prompt.  
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var reprompt = require('../lib/reprompt');

//
// Start the prompt
//
reprompt.start();

//
// Beseech two properties from the user: username and email
//
reprompt.get(['username', 'email'], function (err, result) {
  //
  // Log the results.
  //
  console.log('Command-line input received:');
  console.log('  username: ' + result.username);
  console.log('  email: ' + result.email);
});