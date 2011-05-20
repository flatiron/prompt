/*
 * add-properties.js: Example of how to add properties to an object using beseech.  
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
// Add two properties to the empty object: username and email
//
beseech.addProperties({}, ['username', 'email'], function (err, result) {
  //
  // Log the results.
  //
  console.log('Updated object received:');
  console.dir(result);
});