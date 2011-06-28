/*
 * prompt.js: Simple prompt for prompting information from the command line
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var events = require('events'),
    async = require('async'),
    colors = require('colors'),
    winston = require('winston'),
    stdio = process.binding('stdio');

//
// ### @private function capitalize (str)
// #### str {string} String to capitalize
// Capitalizes the string supplied.
//
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

var prompt = module.exports = Object.create(events.EventEmitter.prototype);

var logger = prompt.logger = new winston.Logger({
  transports: [
    new (winston.transports.Console)()
  ]
});

prompt.started    = false;
prompt.paused     = false;
prompt.allowEmpty = false;

var stdin, stdout;

//
// Create an empty object for the properties
// known to `node-prompt`
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
  stdin   = options.stdin  || process.openStdin();
  stdout  = options.stdout || process.stdout;

  prompt.allowEmpty = options.allowEmpty || false;

  process.on('SIGINT', function () {
    stdout.write('\n');
    process.exit(1);
  });

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
// ### function get (msg, [validator,] callback)
// #### @msg {Array|Object|string} Set of variables to get input for.
// #### @callback {function} Continuation to pass control to when complete.
// Gets input from the user via stdin for the specified message(s) `msg`.
//
prompt.get = function (msg, callback) {
  var vars = !Array.isArray(msg) ? [msg] : msg,
      result = {};

  vars = vars.map(function (v) {
    if (typeof v === 'string') {
      v = v.toLowerCase();
    }

    return prompt.properties[v] || v;
  });

  function get(target, next) {
    prompt.getInput(target, function (err, line) {
      if (err) {
        return next(err);
      }

      var name = target.name || target;
      result[name] = line;
      next();
    });
  }

  async.forEachSeries(vars, get, function (err) {
    return err ? callback(err) : callback(null, result);
  });

  return prompt;
};

//
// ### function getInput (msg, validator, callback)
// #### @msg {Object|string} Variable to get input for.
// #### @callback {function} Continuation to pass control to when complete.
// Gets input from the user via stdin for the specified message `msg`.
//
prompt.getInput = function (prop, callback) {
  var name   = prop.message || prop.name || prop,
      raw    = ['prompt', ': ' + name.grey, ': '.grey],
      read   = prop.hidden ? prompt.readLineHidden : prompt.readLine,
      length, msg;

  if (prop.default) {
    raw.splice(2, -1, ' (' + prop.default + ')');
  }

  // Calculate the raw length and colorize the prompt
  length = raw.join('').length;
  raw[0] = raw[0];
  msg = raw.join('');

  if (prop.help) {
    prop.help.forEach(function (line) {
      logger.help(line);
    });
  }

  stdout.write(msg);
  prompt.emit('prompt', prop);

  read.call(null, function (err, line) {
    if (err) {
      return callback(err);
    }

    if (!line || line === '') {
      line = prop.default || line;
    }

    if (!prop.validator && prop.empty !== false) {
      logger.input(line.yellow);
      return callback(null, line);
    }

    var valid = true,
        validator = prop.validator;
    
    function next(valid) {
      if (arguments.length < 1) {
        valid = true;
      }

      if (prop.empty === false && valid) {
        valid = line.length > 0;
        if (!valid) {
          prop.warning = prop.warning || 'You must supply a value.';
        }
      }

      if (!valid) {
        logger.error('Invalid input for ' + name.grey);
        if (prop.warning) {
          logger.error(prop.warning);
        }

        prompt.emit('invalid', prop, line);
        return prompt.getInput(prop, callback);
      }

      logger.input(line.yellow);
      callback(null, line);
    }

    if (validator) {
      if (validator.test) {
        valid = validator.test(line)
      }
      else if (typeof validator === 'function') {
        return validator.length < 2
          ? next(validator(line))
          : validator(line, next);
      }
      else {
        return callback(new Error('Invalid valiator: ' + typeof validator));
      }
    }

    next(valid);
  });

  return prompt;
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
  var value = '', index = 0;
  stdio.setRawMode(true);
  prompt.resume();
  stdin.on('error', callback);
  stdin.on('data', function data (c) {
    if(index < 0) {
      index = 0;
    }
    else if(index >= value.length) {
      index = value.length;
    }
    c = '' + c;
    switch (c) {
      case '\n': case '\r': case '\r\n': case '\u0004':
        stdio.setRawMode(false);
        stdin.removeListener('data', data);
        stdin.removeListener('error', callback);
        value = value.trim();
        stdout.write('\n');
        stdout.flush();
        prompt.pause();
        return callback(null, value);
      case '\u0003': case '\0':
        stdout.write('\n');
        process.exit(1);
        break;
      case '\b': case '\x7f':
        value = value.slice(0, index -1) + value.slice(index);
        index--;
        break;
      /*
      case '\x1b\x4f\x48':
        index = 0;
        break;
      case '\x1b\x4f\x46':
        index = value.length;
        break;
      case '\x1b\x5b\x44':
        index--;
        break;
      case '\x1b\x5b\x43':
        index++;
        break;
      case '\x1b\x5b\x33\x7e':
        value = value.slice(0, index) + value.slice(index + 1);
        break;
      */
      default:
        value = value.slice(0,index) + c + value.slice(index);
        index++;
        break;
    }
  });

  return prompt;
};
