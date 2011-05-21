/*
 * reprompt.js: Simple prompt for reprompting information from the command line 
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

var reprompt = module.exports = Object.create(events.EventEmitter.prototype);

var logger = reprompt.logger = new winston.Logger({
  transports: [
    new (winston.transports.Console)()
  ]
});
    
reprompt.started    = false;
reprompt.paused     = false;
reprompt.allowEmpty = false; 

var stdin, stdout;

//
// Create an empty object for the properties 
// known to the reprompt prompt
//
reprompt.properties = {};

//
// Setup the default winston logger to use 
// the `cli` levels and colors.
//
logger.cli();

//
// ### function start (options)
// #### @options {Object} **Optional** Options to consume by reprompt
// Starts the prompt by listening to the appropriate events on `options.stdin`
// and `options.stdout`. If no streams are supplied, then `process.stdin` 
// and `process.stdout` are used, respectively.
//
reprompt.start = function (options) {
  if (reprompt.started) {
    return;
  }
  
  options = options        || {};
  stdin   = options.stdin  || process.openStdin();
  stdout  = options.stdout || process.stdout;
  
  reprompt.allowEmpty = options.allowEmpty || false;
  
  process.on('SIGINT', function () {
    stdout.write('\n');
    process.exit(1);
  })
  
  reprompt.emit('start');
  reprompt.started = true;
  return reprompt;
};

//
// ### function pause ()
// Pauses input coming in from stdin
//
reprompt.pause = function () {
  if (!reprompt.started || reprompt.paused) {
    return;
  }
  
  stdin.pause();
  reprompt.emit('pause');
  reprompt.paused = true;
  return reprompt;
};

//
// ### function resume ()
// Resumes input coming in from stdin 
//
reprompt.resume = function () {
  if (!reprompt.started || !reprompt.paused) {
    return;
  }
  
  stdin.resume();
  reprompt.emit('resume');
  reprompt.paused = false;
  return reprompt;
};

//
// ### function get (msg, [validator,] callback)
// #### @msg {Array|Object|string} Set of variables to get input for.
// #### @callback {function} Continuation to pass control to when complete.
// Gets input from the user via stdin for the specified message(s) `msg`.
//
reprompt.get = function (msg, callback) {
  var vars = !Array.isArray(msg) ? [msg] : msg,
      result = {};
  
  vars = vars.map(function (v) {
    if (typeof v === 'string') {
      v = v.toLowerCase();
    }
    
    return reprompt.properties[v] || v;
  });
  
  function get(target, next) {
    reprompt.getInput(target, function (err, line) {
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
  
  return reprompt;
};

//
// ### function getInput (msg, validator, callback)
// #### @msg {Object|string} Variable to get input for.
// #### @callback {function} Continuation to pass control to when complete.
// Gets input from the user via stdin for the specified message `msg`.
//
reprompt.getInput = function (prop, callback) {
  var name   = prop.message || prop.name || prop,
      raw    = ['prompt', ': ' + name.grey, ': '.grey],
      read   = prop.hidden ? reprompt.readLineHidden : reprompt.readLine,
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
  reprompt.emit('prompt', prop);
  
  read.call(null, function (err, line) {
    if (err) {
      return callback(err);
    }
  
    if (!line || line === '') {
      line = prop.default || line;
    }
    
    if (prop.validator || prop.empty === false) {
      var valid;
      
      if (prop.validator) {
        valid = prop.validator.test 
         ? prop.validator.test(line)
         : prop.validator(line);
      }
      
      if (prop.empty === false) {
        valid = line.length > 0;
        prop.warning = prop.warning || 'You must supply a value.';
      }
      
      if (!valid) {
        logger.error('Invalid input for ' + name.grey);
        if (prop.warning) {
          logger.error(prop.warning);
        }
        
        reprompt.emit('invalid', prop, line);
        return reprompt.getInput(prop, callback);
      }
    }
        
    logger.input(line.yellow);
    callback(null, line);
  });

  return reprompt;
};

//
// ### function addProperties (obj, properties, callback) 
// #### @obj {Object} Object to add properties to
// #### @properties {Array} List of properties to get values for
// #### @callback {function} Continuation to pass control to when complete.
// Prompts the user for values each of the `properties` if `obj` does not already
// have a value for the property. Responds with the modified object.  
//
reprompt.addProperties = function (obj, properties, callback) {
  properties = properties.filter(function (prop) {
    return typeof obj[prop] === 'undefined';
  });
  
  if (properties.length === 0) {
    return callback(obj);
  }
  
  reprompt.get(properties, function (err, results) {
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
  
  return reprompt;
};

//
// ### function readLine (callback)
// #### @callback {function} Continuation to respond to when complete
// Gets a single line of input from the user. 
//
reprompt.readLine = function (callback) {
  var value = '', buffer = '';
  reprompt.resume();
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
      val = value.substr(0, value.indexOf('\n'));
      reprompt.pause();
      stdin.removeListener('data', data);
      stdin.removeListener('error', callback);
      value = value.trim();
      callback(null, value);
    }
  });
  
  return reprompt;
};

//
// ### function readLineHiggen (callback)
// #### @callback {function} Continuation to respond to when complete
// Gets a single line of hidden input (i.e. `rawMode = true`) from the user. 
//
reprompt.readLineHidden = function (callback) {
  var value = '', buffer = '';
  stdio.setRawMode(true);
  reprompt.resume();
  stdin.on('error', callback);
  stdin.on('data', function data (c) {
    c = '' + c;
    switch (c) {
      case '\n': case '\r': case '\r\n': case '\u0004':
        stdio.setRawMode(false);
        stdin.removeListener('data', data);
        stdin.removeListener('error', callback);
        value = value.trim();
        stdout.write('\n');
        stdout.flush();
        reprompt.pause();
        return callback(null, value)
      case '\u0003': case '\0':
        stdout.write('\n');
        process.exit(1);
        break;
      default:
        value += buffer + c
        buffer = '';
        break;
    }
  });
  
  return reprompt;
};