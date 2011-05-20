# beseech

A beautiful command-line prompt for node.js

## Installation

### Installing npm (node package manager)
```
  curl http://npmjs.org/install.sh | sh
```

### Installing beseech
```
  [sudo] npm install beseech
```

## Usage
Using beseech is relatively straight forward. There are two core methods you should be aware of: `beseech.get()` and `beseech.addProperties()`. There methods take strings representing property names in addition to objects for complex property validation (and more). There are a number of [examples][0] that you should examine for detailed usage.

### Getting Basic Prompt Information
Getting started with `beseech` is easy. Lets take a look at `examples/simple-prompt.js`:

``` js
  var beseech = require('beseech');

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
  })
```

This will result in the following command-line output:

```
  $ node examples/simple-prompt.js 
  prompt: username: some-user
  prompt: email: some-user@some-place.org
  Command-line input received:
    username: some-user
    email: some-user@some-place.org
```

### Prompting with Validation, Default Values, and More (Complex Properties)

### Adding Properties to an Object 

## Valid Property Settings

## Running tests
```
  vows test/*-test.js --spec
```

#### Author: [Charlie Robbins][1]

[0]: https://github.com/nodejitsu/beseech/tree/master/examples
[1]: http://nodejitsu.com