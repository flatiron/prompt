/*
 * beseech-test.js: Tests for the beseech prompt.  
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var assert = require('assert'),
    vows = require('vows'),
    beseech = require('../lib/beseech'),
    helpers = require('./helpers');

vows.describe('beseech').addBatch({
  "When using beseech": {
    topic: function () {
      return beseech.start(helpers.stdin, helpers.stdout);
    },
    "the readLine() method": {
      topic: function () {
        beseech.readLine(this.callback);
        helpers.stdin.write('testing\n');
      },
      "should respond with data from the stdin stream": function (err, input) {
        assert.isNull(err);
        assert.equal(input, 'testing');
      }
    },
    "the readLineHidden() method": {
      topic: function () {
        beseech.readLineHidden(this.callback);
        helpers.stdin.write('testing');
        helpers.stdin.write('\r\n');
      },
      "should respond with data from the stdin stream": function (err, input) {
        assert.isNull(err);
        assert.equal(input, 'testing');
      }
    }
  }
}).export(module);