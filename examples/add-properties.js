/*
 * add-properties.js: Example of how to add properties to an object using reprompt.  
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var reprompt = require('../lib/reprompt');

//
// Start the prompt
//
reprompt.start();

var obj = {
  password: 'lamepassword',
  mindset: 'NY'
}

//
// Log the initial object.
//
console.log('Initial object to be extended:');
console.dir(obj);

//
// Add two properties to the empty object: username and email
//
reprompt.addProperties(obj, ['username', 'email'], function (err) {
  //
  // Log the results.
  //
  console.log('Updated object received:');
  console.dir(obj);
});