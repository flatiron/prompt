var prompt = require('../lib/prompt');

prompt.start();

prompt.get([{
    name: 'integer',
    type: 'integer',
    required: true
  }, {
    name: 'number',
    type: 'number',
    required: true
  }, {
    name: 'boolean',
    type: 'boolean',
    required: true
  }], function (err, result) {
  console.log('Input received:');
  console.log(JSON.stringify(result, null, 2));
});
