/*
 * simple-prompt.js: Simple example of using the beseech prompt.  
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var beseech = require('../lib/beseech');

//
// Start the prompt
//
beseech.start();

//
// Beseech two properties from the user: username and email
//
beseech.get(['username', 'email'], function (err, result) {
  //
  // Log the results.
  //
  console.log('Command-line input received:');
  console.log('  username: ' + result.username);
  console.log('  email: ' + result.email);
});