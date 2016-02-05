/*
 * dynamic-ask-prompt.js: Dynamically decide whether to display prompt.
 */

var prompt = require('../lib/prompt');

var schema = {
  properties: {
    proxy: {
      description: 'Proxy url'
    },
    proxyCredentials: {
      description: 'Proxy credentials',
      ask: function() {
        // only ask for proxy credentials if a proxy was set
        return prompt.history('proxy').value > 0;
      }
    }
  }
};

//
// Start the prompt
//
prompt.start();

//
// Get one or two properties from the user, depending on
// what the user answered for proxy
//
prompt.get(schema, function (err, result) {
  //
  // Log the results.
  //
  console.log('Command-line input received:');
  console.log('  proxy: ' + result.proxy);
  console.log('  credentials: ' + result.proxyCredentials);
});
