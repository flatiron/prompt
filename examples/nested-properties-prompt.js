/*
 * property-prompt.js: Example of using prompt with complex properties.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var prompt = require('../lib/prompt');

var schema = {
  properties: {
    url: {
      required: true
    },
    auth: {
      properties: {
        username: {
          required: true
        },
        password: {
          required: true,
          hidden: true
        }
      }
    }
  }
};

//
// Start the prompt
//
prompt.start();

//
// Get two properties from the user: email, password
//
prompt.get(schema, function (err, result) {
  //
  // Log the results.
  //
  console.log('Command-line input received:');
  console.log('  url: ' + result.url);
  console.log(result);
  console.log('  auth:username: ' + result.auth.username);
  console.log('  auth:password: ' + result.auth.password);
});
