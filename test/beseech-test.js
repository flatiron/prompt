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
      beseech.start(helpers.stdin, helpers.stdout);
      return null;
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
    },
    "the getInput() method": {
      "with a simple string prompt": {
        topic: function () {
          var that = this;
          helpers.stdout.once('data', function (msg) {
            that.msg = msg;
          })
          
          beseech.getInput('test input', this.callback);
          helpers.stdin.write('test value\n');
        },
        "should write the specified data to stdout and respond with data": function (err, input) {
          assert.isNull(err);
          assert.equal(input, 'test value');
          assert.isTrue(this.msg.indexOf('test input') !== -1);
        }
      },
      "with a complex property prompt": {
        "and a valid input": {
          topic: function () {
            var that = this;
            helpers.stdout.once('data', function (msg) {
              that.msg = msg;
            });

            beseech.getInput(helpers.properties.username, this.callback);
            helpers.stdin.write('some-user\n');
          },
          "should write the specified data to stdout and respond with data": function (err, input) {
            assert.isNull(err);
            assert.equal(input, 'some-user');
            assert.isTrue(this.msg.indexOf('username') !== -1);
          }
        }
      },
      "and an invalid input": {
        topic: function () {
          var that = this;
          helpers.stdout.once('data', function (msg) {
            that.msg = msg;
          });

          helpers.stderr.once('data', function (msg) {
            that.errmsg = msg;
          })

          beseech.getInput(helpers.properties.username, this.callback);

          beseech.once('invalid', function () {
            beseech.once('prompt', function () {
              process.nextTick(function () {
                helpers.stdin.write('some-user\n');
              })
            })
          });

          helpers.stdin.write('some -user\n');
        },
        "should prompt with an error before completing the operation": function (err, input) {
          assert.isNull(err);
          assert.equal(input, 'some-user');
          assert.isTrue(this.errmsg.indexOf('Invalid input') !== -1);
          assert.isTrue(this.msg.indexOf('username') !== -1);
        }
      }
    }
  }
}).export(module);