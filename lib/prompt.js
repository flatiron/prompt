/*
 * prompt.js: Simple prompt for prompting information from the command line
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var events = require('events'),
    utile = require('utile'),
    async = utile.async,
    capitalize = utile.inflect.capitalize,
    colors = require('colors'),
    winston = require('winston'),
    validate = require('revalidator').validate,
    tty = require('tty');

//
// Expose version using `pkginfo`
//
require('pkginfo')(module, 'version');

var stdin, stdout, history = [];
var prompt = module.exports = Object.create(events.EventEmitter.prototype);
var logger = prompt.logger = new winston.Logger({
  transports: [new (winston.transports.Console)()]
});

prompt.started    = false;
prompt.paused     = false;
prompt.allowEmpty = false;
prompt.message    = 'prompt';
prompt.delimiter  = ': ';

//
// Create an empty object for the properties
// known to `prompt`
//
prompt.properties = {};

//
// Setup the default winston logger to use
// the `cli` levels and colors.
//
logger.cli();

//
// ### function start (options)
// #### @options {Object} **Optional** Options to consume by prompt
// Starts the prompt by listening to the appropriate events on `options.stdin`
// and `options.stdout`. If no streams are supplied, then `process.stdin`
// and `process.stdout` are used, respectively.
//
prompt.start = function (options) {
  if (prompt.started) {
    return;
  }

  options = options        || {};
  stdin   = options.stdin  || process.stdin;
  stdout  = options.stdout || process.stdout;

  stdin.resume && stdin.resume();

  //
  // By default: Remember the last `10` prompt property /
  // answer pairs and don't allow empty responses globally.
  //
  prompt.memory     = options.memory     || 10;
  prompt.allowEmpty = options.allowEmpty || false;
  prompt.message    = options.message    || prompt.message;
  prompt.delimiter  = options.delimiter  || prompt.delimiter;

  if (process.platform !== 'win32') {
    // windows falls apart trying to deal with SIGINT
    process.on('SIGINT', function () {
      stdout.write('\n');
      process.exit(1);
    });
  }

  prompt.emit('start');
  prompt.started = true;
  return prompt;
};

//
// ### function pause ()
// Pauses input coming in from stdin
//
prompt.pause = function () {
  if (!prompt.started || prompt.paused) {
    return;
  }

  stdin.pause();
  prompt.emit('pause');
  prompt.paused = true;
  return prompt;
};

//
// ### function resume ()
// Resumes input coming in from stdin
//
prompt.resume = function () {
  if (!prompt.started || !prompt.paused) {
    return;
  }

  stdin.resume();
  prompt.emit('resume');
  prompt.paused = false;
  return prompt;
};

//
// ### function history (search)
// #### @search {Number|string} Index or property name to find.
// Returns the `property:value` pair from within the prompts
// `history` array.
//
prompt.history = function (search) {
  if (typeof search === 'number') {
    return history[search] || {};
  }

  var names = history.map(function (pair) {
    return typeof pair.property === 'string'
      ? pair.property
      : pair.property.name;
  });

  if (~names.indexOf(search)) {
    return null;
  }

  return history.filter(function (name) {
    return typeof pair.property === 'string'
      ? pair.property === name
      : pair.property.name === name;
  })[0];
};

//
// ### function convert (schema)
// #### @schema {Object} Schema for a property
// Converts the schema into new format if it is in old format
//
var convert = function (schema) {
  var newSchema = false,
      newProps = Object.keys(validate.messages);

  newProps = newProps.concat(['description','dependencies']);

  for (var key in schema) {
    if (newProps.indexOf(key) > 0) {
      newSchema = true;
      break;
    }
  }

  if (!newSchema || schema.validator ||
    schema.warning || schema.empty != null
  ) {
    schema.description = schema.message;
    schema.message = schema.warning;
    schema.pattern = schema.validator;

    if (schema.empty != null) {
      schema.required = !(schema.empty);
    }

    delete schema.warning;
    delete schema.validator;
    delete schema.empty;
  }

  return schema;
};

//
// ### function get (msg, callback)
// #### @msg {Array|Object|string} Set of variables to get input for.
// #### @callback {function} Continuation to pass control to when complete.
// Gets input from the user via stdin for the specified message(s) `msg`.
//
prompt.get = function (schema, callback) {

  iterate(schema, function get(target, next) {
    var path = target.path,
        schema = target.schema;

    prompt.getInput(target, function (err, line) {
      if (err) {
        return next(err);
      }
      next(null, line);
    });
  }, callback);

  return prompt;

  // iterate over the values in the schema,
  // represented as legit single-property object sub-schemas.
  function iterate(schema, get, cb) {
    var iterator = [];

    // We can iterate over a single string, ...
    if (typeof schema == 'string') {
      iterator.push({
        path: [ schema ],
        schema: {}
      });
    } // ..an array of strings and/or single-prop schema and/or no-prop schema...
    else if (Array.isArray(schema)) {
      iterator = schema.map(function (element) {
        if (typeof element == 'string') {
          return {
            path: [ element ],
            schema: prompt.properties[element.toLowerCase()] || {}
          }
        }
        else if (element.properties) {
          return {
            path: [ Object.keys(element.properties)[0] ],
            schema: element.properties[Object.keys(element.properties)[0]]
          };
        }
        else if (element.path && element.schema) {
          return element;
        }
        else {
          return {
            path: [ element.name || 'question' ],
            schema: element
          };
        }
      });
    } //..or a complete schema...
    else if (schema.properties) {
      // `untangle` is defined later.
      iterator = untangle(schema);
    } //...or a partial schema and path. TODO: Evaluate need for this option.
    else {
      iterator = [{
        schema: schema.schema ? schema.schema : schema,
        path: schema.path || [ schema.name || 'question' ]
      }];

    }

    var result = {};

    // Now, iterate and assemble the result.
    async.forEachSeries(iterator, function (branch, next) {
      get(branch, function assembler(err, line) {
        if (err) {
          return next(err);
        }

        result = attach(result, build(branch.path, line));

        next();

        function build(path, line) {
          var o = {};
          if (path.length) {
            o[path[0]] = build(path.slice(1), line);
            return o;
          }
          else {
            return line;
          }
        }

        function attach(obj, attr) {
          var keys;
          if (attr instanceof Object) {
            keys = Object.keys(attr);
            if (keys.length) {
              if (!obj[keys[0]]) {
                obj[keys[0]] = {};
              }
              obj[keys[0]] = attach(obj[keys[0]], attr[keys[0]]);
            }
            return obj;
          }
          return attr;
        }

      });

    }, function (err) {
      return err ? cb(err) : cb(null, result);
    });


    // Transforms a full JSON-schema into an array describing path and sub-schemas.
    // Used for iteration purposes.
    function untangle(schema, path) {
      var results = [];
      path = path || [];

      if (schema.properties) {
        // Iterate over the properties in the schema and use recursion
        // to process sub-properties.
        Object.keys(schema.properties).forEach(function (k) {
          var o = {};
          o[k] = schema.properties[k];

          // Concat a sub-untangling to the results.
          results = results.concat(untangle(o[k], path.concat(k)));
        });

        // Return the results.
        return results;
      }
      else {
        // This is a schema "leaf."
        return {
          path: path,
          schema: schema
        };
      }
    }
  }
};

//
// ### function confirm (msg, callback)
// #### @msg {Array|Object|string} set of message to confirm
// #### @callback {function} Continuation to pass control to when complete.
// Confirms a single or series of messages by prompting the user for a Y/N response.
// Returns `true` if ALL messages are answered in the affirmative, otherwise `false`
//
// `msg` can be a string, or object (or array of strings/objects).
// An object may have the following properties:
//  {
//    description: 'yes/no' // message to prompt user
//    pattern: /^[yntf]{1}/i // optional - regex defining acceptable responses
//    yes: /^[yt]{1}/i // optional - regex defining `affirmative` responses
//    message: 'yes/no' // optional - message to display for invalid responses
//  }
//
prompt.confirm = function (msg, callback) {
  var vars = !Array.isArray(msg) ? [msg] : msg,
      RX_Y = /^[yt]{1}/i,
      RX_YN = /^[yntf]{1}/i;

  function confirm(target, next) {
    var yes = target.yes || RX_Y,
      options = {
        description: typeof target === 'string' ? target : target.description||'yes/no',
        pattern: target.pattern || RX_YN,
        name: 'confirm',
        message: target.message || 'yes/no'
      };

    prompt.get([options], function (err, result) {
      next(err ? false : yes.test(result[options.name]));
    });
  }
  async.rejectSeries(vars, confirm, function(result) {
    callback(null, result.length===0);
  });

};

// ### function getInput (prop, callback)
// #### @prop {Object|string} Variable to get input for.
// #### @callback {function} Continuation to pass control to when complete.
// Gets input from the user via stdin for the specified message `msg`.
//
prompt.getInput = function (prop, callback) {
  var schema = prop.schema || prop,
      propName = prop.path && prop.path.join(':') || prop,
      storedSchema = prompt.properties[propName.toLowerCase()],
      delim = prompt.delimiter, raw,
      name, read, defaultLine, length, msg, valid, against;

  if (
    schema instanceof Object && !Object.keys(schema).length &&
    typeof storedSchema !== 'undefined'
  ) {
    schema = storedSchema;
  }

  schema = convert(schema);

  name = prop.description || schema.description || propName;
  read = (schema.hidden ? prompt.readLineHidden : prompt.readLine);
  raw = [prompt.message, delim + name.grey, delim.grey];

  defaultLine = schema.default;
  prop = {
    schema: schema,
    path: propName.split(':')
  };

  // Handle overrides here.
  // TODO: Make overrides nestable
  if (prompt.override && prompt.override[propName]) {
    return callback (null, prompt.override[propName])
  }

  // Build a proper validation schema if we just have a string
  if (typeof prop == 'string') {
    schema = {};
  }

  // TODO: Isn't this broken? Maybe?
  if (!schema.properties) {
    schema = (function () {
      var o = {
        properties: {}
      };

      o.properties[propName] = schema;

      return o;
    })();
  }

  // Show the default in the prompt (this is correct)
  if (defaultLine) {
    raw.splice(2, -1, ' (' + defaultLine + ')');
  }

  // Calculate the raw length and colorize the prompt
  length = raw.join('').length;
  raw[0] = raw[0];
  msg = raw.join('');

  if (schema.help) {
    schema.help.forEach(function (line) {
      logger.help(line);
    });
  }

  // Write the message, emit a "prompting" event
  // TODO: Find prompt.on's
  stdout.write(msg);
  prompt.emit('prompt', schema);

  // Make the actual read
  read.call(null, function (err, line) {
    if (err) {
      return callback(err);
    }

    var valid,
        against = {};

    // Apply defaults. This is cool.
    if (!line || line === '') {
      line = defaultLine || line;
    }

    if (line && !(line === '')) {
      against[propName] = line;
    }

    // Validate.
    try {
      valid = validate(against, schema);
    }
    catch (err) {
      return callback(err);
    }

    if (!valid.valid) {
      logger.error('Invalid input for ' + name.grey);
      if (prop.schema.message) {
        logger.error(prop.schema.message);
      }

      prompt.emit('invalid', prop, line);
      return prompt.getInput(prop, callback);
    }

    //
    // Log the resulting line, append this `property:value`
    // pair to the history for `prompt` and respond to
    // the callback.
    //
    logger.input(line.yellow);
    prompt._remember(propName, line);
    callback(null, line);
  });
};

//
// ### function addProperties (obj, properties, callback)
// #### @obj {Object} Object to add properties to
// #### @properties {Array} List of properties to get values for
// #### @callback {function} Continuation to pass control to when complete.
// Prompts the user for values each of the `properties` if `obj` does not already
// have a value for the property. Responds with the modified object.
//
prompt.addProperties = function (obj, properties, callback) {
  properties = properties.filter(function (prop) {
    return typeof obj[prop] === 'undefined';
  });

  if (properties.length === 0) {
    return callback(obj);
  }

  prompt.get(properties, function (err, results) {
    if (err) {
      return callback(err);
    }
    else if (!results) {
      return callback(null, obj);
    }

    function putNested (obj, path, value) {
      var last = obj, key;

      while (path.length > 1) {
        key = path.shift();
        if (!last[key]) {
          last[key] = {};
        }

        last = last[key];
      }

      last[path.shift()] = value;
    }

    Object.keys(results).forEach(function (key) {
      putNested(obj, key.split('.'), results[key]);
    });

    callback(null, obj);
  });

  return prompt;
};

//
// ### function readLine (callback)
// #### @callback {function} Continuation to respond to when complete
// Gets a single line of input from the user.
//
prompt.readLine = function (callback) {
  var value = '', buffer = '';
  prompt.resume();
  stdin.setEncoding('utf8');
  stdin.on('error', callback);
  stdin.on('data', function data (chunk) {
    value += buffer + chunk;
    buffer = '';
    value = value.replace(/\r/g, '');
    if (value.indexOf('\n') !== -1) {
      if (value !== '\n') {
        value = value.replace(/^\n+/, '');
      }

      buffer = value.substr(value.indexOf('\n'));
      value = value.substr(0, value.indexOf('\n'));
      prompt.pause();
      stdin.removeListener('data', data);
      stdin.removeListener('error', callback);
      value = value.trim();
      callback(null, value);
    }
  });

  return prompt;
};

//
// ### function readLineHidden (callback)
// #### @callback {function} Continuation to respond to when complete
// Gets a single line of hidden input (i.e. `rawMode = true`) from the user.
//
prompt.readLineHidden = function (callback) {
  var value = '';

  function raw(mode) {
    var setRawMode = stdin.setRawMode || tty.setRawMode;
    setRawMode.call(stdin, mode);
  }

  //
  // Ignore errors from `.setRawMode()` so that `prompt` can
  // be scripted in child processes.
  //
  try { raw(true) }
  catch (ex) { }

  prompt.resume();
  stdin.on('error', callback);
  stdin.on('data', function data (line) {
    line = line + '';
    for(var i = 0; i < line.length; i++) {
      var c = line[i];
      switch (c) {
        case '\n': case '\r': case '\r\n': case '\u0004':
          try { raw(false) }
          catch (ex) { }
          stdin.removeListener('data', data);
          stdin.removeListener('error', callback);
          value = value.trim();
          stdout.write('\n');
          stdout.flush && stdout.flush();
          prompt.pause();
          return callback(null, value);
        case '\x7f': case'\x08':
          value = value.slice(0,-1);
          break;
        case '\u0003': case '\0':
          stdout.write('\n');
          process.exit(1);
          break;
        default:
          value = value + c;
          break;
      }
    }
  });

  return prompt;
};

//
// ### @private function _remember (property, value)
// #### @property {Object|string} Property that the value is in response to.
// #### @value {string} User input captured by `prompt`.
// Prepends the `property:value` pair into the private `history` Array
// for `prompt` so that it can be accessed later.
//
prompt._remember = function (property, value) {
  history.unshift({
    property: property,
    value: value
  });

  //
  // If the length of the `history` Array
  // has exceeded the specified length to remember,
  // `prompt.memory`, truncate it.
  //
  if (history.length > prompt.memory) {
    history.splice(prompt.memory, history.length - prompt.memory);
  }
};
