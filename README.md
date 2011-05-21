# reprompt

A beautiful command-line prompt for node.js

## Installation

### Installing npm (node package manager)
```
  curl http://npmjs.org/install.sh | sh
```

### Installing reprompt
```
  [sudo] npm install reprompt
```

## Usage
Using reprompt is relatively straight forward. There are two core methods you should be aware of: `reprompt.get()` and `reprompt.addProperties()`. There methods take strings representing property names in addition to objects for complex property validation (and more). There are a number of [examples][0] that you should examine for detailed usage.

### Getting Basic Prompt Information
Getting started with `reprompt` is easy. Lets take a look at `examples/simple-prompt.js`:

``` js
  var reprompt = require('reprompt');

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
In addition to prompting the user with simple string prompts, 


### Adding Properties to an Object 
A common use-case for prompting users for data from the command-line is to extend or create a configuration object that is passed onto the entry-point method for your CLI tool. `reprompt` exposes a convenience method for doing just this: 

``` js
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
```

## Valid Property Settings
Beseech uses a simple property system for performing a couple of basic validation operations against input received from the command-line. The motivations here were speed and simplicity of implementation to integration of pseudo-standards like JSON-Schema were not feasible. 

Lets examine the anatomy of a reprompt property:

``` js
  {
    message: 'Enter your password',     // Prompt displayed to the user. If not supplied name will be used.
    name: 'password'                    // Key in the JSON object returned from `.get()`.
    validator: /^\w+$/                  // Regular expression that input must be valid against.
    warning: 'Password must be letters' // Warning message to display if validation fails.
    hidden: true                        // If true, characters entered will not be output to console.
    default: 'lamepassword'             // Default value to use if no value is entered.
    empty: false                        // If false, value entered must be non-empty.
  }
```

## Running tests
```
  vows test/*-test.js --spec
```

#### Author: [Charlie Robbins][1]

[0]: https://github.com/nodejitsu/reprompt/tree/master/examples
[1]: http://nodejitsu.com