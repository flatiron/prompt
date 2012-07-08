/*
 * prompt-test.js: Tests for prompt.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    vows = require('vows'),
    prompt = require('../lib/prompt'),
    helpers = require('./helpers'),
    schema = helpers.schema;

// A helper to pass fragments of our schema into prompt as full schemas.
function grab () {
  var names = [].slice.call(arguments),
      complete = { schema: {} };

  names.forEach(function (name) {
    complete.path = [name],
    complete.schema = schema.properties[name];
  });
  return complete;
};

vows.describe('prompt').addBatch({
  "When using prompt": {
    topic: function () {
      //
      // Reset the prompt for mock testing
      //
      prompt.started = false;
      prompt.start({
        stdin: helpers.stdin,
        stdout: helpers.stdout
      });

      return null;
    },
    "the getInput() method": {
      "with a simple string prompt": {
        topic: function () {
          var that = this;
          helpers.stdout.once('data', function (msg) {
            that.msg = msg;
          })

          prompt.getInput('test input', this.callback);
          helpers.stdin.writeNextTick('test value\n');
        },
        "should prompt to stdout and respond with data": function (err, input) {
          assert.isNull(err);
          assert.equal(input, 'test value');
          assert.isTrue(this.msg.indexOf('test input') !== -1);
        }
      },
      "with any field that is not supposed to be empty": {
        "and we don't provide any input": {
          topic: function () {
            var that = this;
            helpers.stdout.once('data', function (msg) {
              that.msg = msg;
            });

            helpers.stderr.once('data', function (msg) {
              that.errmsg = msg;
            });

            prompt.getInput(grab('notblank'), function () {});
            prompt.once('invalid', this.callback.bind(null, null))
            helpers.stdin.writeNextTick('\n');
          },
          "should prompt with an error": function (_, prop, input) {
            assert.isObject(prop);
            assert.equal(input, '');
            assert.isTrue(this.errmsg.indexOf('Invalid input') !== -1);
            assert.isTrue(this.msg.indexOf('notblank') !== -1);
          }
        }
      },
      "with a hidden field that is not supposed to be empty": {
        "and we provide valid input": {
          topic: function () {
            var that = this;
            helpers.stdout.once('data', function (msg) {
              that.msg = msg;
            });

            prompt.getInput('password', this.callback);
            helpers.stdin.writeNextTick('trustno1\n');
          },

          "should prompt to stdout and respond with data": function (err, input) {
            assert.isNull(err);
            assert.equal(input, 'trustno1');
            assert.isTrue(this.msg.indexOf('password') !== -1);
          }
        },
        "and we don't provide an input": {
          topic: function () {
            var that = this;
            helpers.stdout.once('data', function (msg) {
              that.msg = msg;
            });

            helpers.stderr.once('data', function (msg) {
              that.errmsg = msg;
            });

            prompt.getInput(grab('password'), function () {} );
            prompt.once('invalid', this.callback.bind(null, null))
            helpers.stdin.writeNextTick('\n');
          },
          "should prompt with an error": function (ign, prop, input) {
            assert.isObject(prop);
            assert.equal(input, '');
            assert.isTrue(this.errmsg.indexOf('Invalid input') !== -1);
            assert.isTrue(this.msg.indexOf('password') !== -1);
          }
        }
      },
      "with a complex property prompt": {
        "and a valid input": {
          topic: function () {
            var that = this;
            helpers.stdout.once('data', function (msg) {
              that.msg = msg;
            });

            prompt.getInput(grab('username'), this.callback);
            helpers.stdin.writeNextTick('some-user\n');
          },
          "should prompt to stdout and respond with data": function (err, input) {
            assert.isNull(err);
            assert.equal(input, 'some-user');
            assert.isTrue(this.msg.indexOf('username') !== -1);
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

            prompt.getInput(grab('username'), this.callback);

            prompt.once('invalid', function () {
              prompt.once('prompt', function () {
                process.nextTick(function () {
                  helpers.stdin.writeNextTick('some-user\n');
                })
              })
            });

            helpers.stdin.writeNextTick('some -user\n');
          },
          "should prompt with an error before completing the operation": function (err, input) {
            assert.isNull(err);
            assert.equal(input, 'some-user');
            assert.isTrue(this.errmsg.indexOf('Invalid input') !== -1);
            assert.isTrue(this.msg.indexOf('username') !== -1);
          }
        },
        "with an invalid validator (array)": {
          topic: function () {
            prompt.getInput(grab('badValidator'), this.callback);
          },
          "should respond with an error": function (err, ign) {
            assert.isTrue(!!err);
          }
        }
      }
    }
  }
}).addBatch({
  "When using prompt": {
    topic: function () {
      //
      // Reset the prompt for mock testing
      //
      prompt.started = false;
      prompt.start({
        stdin: helpers.stdin,
        stdout: helpers.stdout
      });

      return null;
    },
    "the get() method": {
      "with a simple string prompt": {
        "that is not a property in prompt.properties": {
          topic: function () {
            var that = this;
            helpers.stdout.once('data', function (msg) {
              that.msg = msg;
            })

            prompt.get('test input', this.callback);
            helpers.stdin.writeNextTick('test value\n');
          },
          "should prompt to stdout and respond with the value": function (err, result) {
            assert.isNull(err);
            assert.include(result, 'test input');
            assert.equal(result['test input'], 'test value');
            assert.isTrue(this.msg.indexOf('test input') !== -1);
          }
        },
        "that is a property name in prompt.properties": {
          "with a default value": {
            topic: function () {
              var that = this;

              helpers.stdout.once('data', function (msg) {
                that.msg = msg;
              });

              prompt.properties.riffwabbles = schema.properties.riffwabbles;
              prompt.get('riffwabbles', this.callback);
              helpers.stdin.writeNextTick('\n');
            },
            "should prompt to stdout and respond with the default value": function (err, result) {
              assert.isNull(err);
              assert.isTrue(this.msg.indexOf('riffwabbles') !== -1);
              assert.isTrue(this.msg.indexOf('(foobizzles)') !== -1);
              assert.include(result, 'riffwabbles');
              assert.equal(result['riffwabbles'], schema.properties['riffwabbles'].default);
            }
          },
          "with a sync function validator": {
            topic: function () {
              var that = this;

              helpers.stdout.once('data', function (msg) {
                that.msg = msg;
              });

              prompt.get(grab('fnvalidator'), this.callback);
              helpers.stdin.writeNextTick('fn123\n');
            },
            "should accept a value that is checked": function (err, result) {
              assert.isNull(err);
              assert.equal(result['fnvalidator'],'fn123');
            }
          }
          //
          // Remark Does not work with revalidator
          //
          // "with a callback validator": {
          //   topic: function () {
          //     var that = this;
          //
          //     helpers.stdout.once('data', function (msg) {
          //       that.msg = msg;
          //     });
          //
          //     prompt.get(grab('cbvalidator'), this.callback);
          //     helpers.stdin.writeNextTick('cb123\n');
          //   },
          //   "should not accept a value that is correct": function (err, result) {
          //     assert.isNull(err);
          //     assert.equal(result['cbvalidator'],'cb123');
          //   }
          // }
        }
      },
      "skip prompt with prompt.overide": {
        topic: function () {
          prompt.override = { coconihet: 'whatever' }
          prompt.get('coconihet', this.callback);
        },
        "skips prompt and uses overide": function (err, results) {
          assert.equal(results.coconihet, 'whatever')
        }
      }
    }
  }
}).addBatch({
  "When using prompt": {
    topic: function () {
      //
      // Reset the prompt for mock testing
      //
      prompt.started = false;
      prompt.start({
        stdin: helpers.stdin,
        stdout: helpers.stdout
      });

      return null;
    },
    "the addProperties() method": {
      topic: function () {
        prompt.addProperties({}, ['foo', 'bar'], this.callback);
        helpers.stdin.writeSequence(['foo\n', 'bar\n']);
      },
      "should add the properties to the object": function (err, obj) {
        assert.isNull(err);
        assert.isObject(obj);
        assert.equal(obj.foo, 'foo');
        assert.equal(obj.bar, 'bar');
      }
    }
  }
}).addBatch({
  "When using prompt": {
    topic: function () {
      //
      // Reset the prompt for mock testing
      //
      prompt.started = false;
      prompt.start({
        stdin: helpers.stdin,
        stdout: helpers.stdout
      });

      return null;
    },
    "the get() method": {
      "with old schema": {
        topic: function () {
          var that = this;

          helpers.stdout.once('data', function (msg) {
            that.msg = msg;
          });

          prompt.properties.username = schema.properties.oldschema;
          prompt.get('username', this.callback);

          helpers.stdin.writeSequence(['\n', 'hell$\n', 'hello\n']);
        },
        "should prompt to stdout and respond with the default value": function (err, result) {
          assert.isNull(err);
          assert.isTrue(this.msg.indexOf('username') !== -1);
          assert.include(result, 'username');
          assert.equal(result.username, 'hello');
        }
      }
    }
  }
}).addBatch({
  "When using prompt": {
    topic: function () {
      //
      // Reset the prompt for mock testing
      //
      prompt.started = false;
      prompt.start({
        stdin: helpers.stdin,
        stdout: helpers.stdout
      });

      return null;
    },
    "the history() method": {
      "when used inside of a complex property": {
        "with correct value(s)": {
          topic: function () {
            prompt.get([grab('animal'), grab('sound')], this.callback);
            helpers.stdin.writeSequence(['dog\n', 'woof\n']);
          },
          "should respond with the values entered": function (err, result) {
            assert.isTrue(!err);
            assert.equal(result.animal, 'dog');
            assert.equal(result.sound, 'woof');
          }
        },
        "with an incorrect value": {
          topic: function () {
            prompt.get([grab('animal'), grab('sound')], function () {});
            prompt.once('invalid', this.callback.bind(null, null));
            helpers.stdin.writeSequence(['dog\n', 'meow\n']);
          },
          "should prompt for the error": function (ign, property, line) {
            assert.equal(property.path.join(''), 'sound');
            assert.equal(line, 'meow');
          }
        }
      }
    }
  }
}).addBatch({
  "when using prompt": {
    topic: function () {
      //
      // Reset the prompt for mock testing
      //
      prompt.started = false;
      prompt.start({
        stdin: helpers.stdin,
        stdout: helpers.stdout
      });

      return null;
    },
    "the get() method": {
      topic: function () {
        prompt.override = { xyz: 468, abc: 123 }
        prompt.get(['xyz', 'abc'], this.callback);
      },
      "should respond with overrides": function (err, results) {
        assert.isNull(err);
        assert.deepEqual(results, { xyz: 468, abc: 123 });
      }
    }
  }
}).addBatch({
  "when using prompt": {
    topic: function () {
      //
      // Reset the prompt for mock testing
      //
      prompt.started = false;
      prompt.start({
        stdin: helpers.stdin,
        stdout: helpers.stdout
      });

      return null;
    },
    "with fancy properties": {
      "the get() method": {
        topic: function () {
          prompt.override = { UVW: 5423, DEF: 64235 }
          prompt.get({
            properties: {
              'UVW': {
                description: 'a custom message',
                default: 6
              },
              'DEF': {
                description: 'a custom message',
                default: 6
              }
            }
          }, this.callback);
        },
        "should respond with overrides": function (err, results) {
          assert.isNull(err);
          assert.deepEqual(results, { UVW: 5423, DEF: 64235 });
        }
      }
    }
  }
}).addBatch({
  "when using prompt": {
    topic: function () {
      //
      // Reset the prompt for mock testing
      //
      prompt.started = false;
      prompt.start({
        stdin: helpers.stdin,
        stdout: helpers.stdout
      });

      return null;
    },
    "the confirm() method": {
      "with a string message" : {
        "responding with Y" : {
          topic: function () {
            prompt.confirm('test', this.callback);
            helpers.stdin.writeNextTick('Y\n');
          },
          "should respond with true" : function(err, result) {
            assert.isNull(err);
            assert.isTrue(result);
          }
        },
        "responding with N" : {
          topic: function () {
            prompt.confirm('test', this.callback);
            helpers.stdin.writeNextTick('N\n');
          },
          "should respond with false" : function(err, result) {
            assert.isNull(err);
            assert.isFalse(result);
          }
        },
        "responding with YES" : {
          topic: function () {
            prompt.confirm('test', this.callback);
            helpers.stdin.writeNextTick('YES\n');
          },
          "should respond with true" : function(err, result) {
            assert.isNull(err);
            assert.isTrue(result);
          }
        },
        "responding with NO" : {
          topic: function () {
            prompt.confirm('test', this.callback);
            helpers.stdin.writeNextTick('NO\n');
          },
          "should respond with false" : function(err, result) {
            assert.isNull(err);
            assert.isFalse(result);
          }
        },
        "responding with T" : {
          topic: function () {
            prompt.confirm('test', this.callback);
            helpers.stdin.writeNextTick('T\n');
          },
          "should respond with true" : function(err, result) {
            assert.isNull(err);
            assert.isTrue(result);
          }
        },
        "responding with F" : {
          topic: function () {
            prompt.confirm('test', this.callback);
            helpers.stdin.writeNextTick('F\n');
          },
          "should respond with false" : function(err, result) {
            assert.isNull(err);
            assert.isFalse(result);
          }
        },
        "responding with TRUE" : {
          topic: function () {
            prompt.confirm('test', this.callback);
            helpers.stdin.writeNextTick('TRUE\n');
          },
          "should respond with true" : function(err, result) {
            assert.isNull(err);
            assert.isTrue(result);
          }
        },
        "responding with FALSE" : {
          topic: function () {
            prompt.confirm('test', this.callback);
            helpers.stdin.writeNextTick('FALSE\n');
          },
          "should respond with false" : function(err, result) {
            assert.isNull(err);
            assert.isFalse(result);
          }
        }
      },
      "with an object" : {
        "and description set" : {
          topic: function() {
            prompt.confirm({description:'a custom message'}, this.callback);
            helpers.stdin.writeNextTick('Y\n');
          },
          "should respond with true" : function(err, result) {
            assert.isNull(err);
            assert.isTrue(result);
          }
        },
        "and they forgot the description" : {
          topic: function() {
            prompt.confirm({}, this.callback);
            helpers.stdin.writeNextTick('Y\n');
          },
          "should respond with true" : function(err, result) {
            assert.isNull(err);
            assert.isTrue(result);
          }
        },
        "and custom validators" : {
          "responding node" : {
            topic: function() {
              prompt.confirm({
                description: 'node or jitsu?',
                pattern: /^(node|jitsu)/i,
                yes: /^node/i
              }, this.callback);
              helpers.stdin.writeNextTick('node\n');
            },
            "should respond with true" : function(err, result) {
              assert.isNull(err);
              assert.isTrue(result);
            }
          },
          "responding jitsu" : {
            topic: function() {
              prompt.confirm({
                description: 'node or jitsu?',
                pattern: /^(node|jitsu)/i,
                yes: /^node/i
              }, this.callback);
              helpers.stdin.writeNextTick('jitsu\n');
            },
            "should respond with false" : function(err, result) {
              assert.isNull(err);
              assert.isFalse(result);
            }
          }
        }
      }
    },
    "with multiple strings" : {
      "responding with yesses" : {
        topic: function() {
          prompt.confirm(["test", "test2", "test3"], this.callback);
          helpers.stdin.writeSequence(['Y\n', 'y\n', 'YES\n']);
        },
        "should respond with true" : function(err, result) {
          assert.isNull(err);
          assert.isTrue(result);
        }
      },
      "responding with one no" : {
        topic: function() {
          prompt.confirm(["test", "test2", "test3"], this.callback);
          helpers.stdin.writeSequence(['Y\n', 'N\n', 'YES\n']);
        },
        "should respond with false" : function(err, result) {
          assert.isNull(err);
          assert.isFalse(result);
        }
      },
      "responding with all noes" : {
        topic: function() {
          prompt.confirm(["test", "test2", "test3"], this.callback);
          helpers.stdin.writeSequence(['n\n', 'NO\n', 'N\n']);
        },
        "should respond with false" : function(err, result) {
          assert.isNull(err);
          assert.isFalse(result);
        }
      }
    },
    "with multiple objects" : {
      "responding with yesses" : {
        topic: function() {
          prompt.confirm([
            { message: "test" },
            { message: "test2" }
          ], this.callback);
          helpers.stdin.writeSequence(['y\n', 'y\n']);
        },
        "should respond with true" : function(err, result) {
          assert.isNull(err);
          assert.isTrue(result);
        }
      },
      "responding with noes" : {
        topic: function() {
          prompt.confirm([
            { message: "test" },
            { message: "test2" }
          ], this.callback);
          helpers.stdin.writeSequence(['n\n', 'n\n']);
        },
        "should respond with false" : function(err, result) {
          assert.isNull(err);
          assert.isFalse(result);
        }
      },
      "responding with yes and no" : {
        topic: function() {
          prompt.confirm([
            { message: "test" },
            { message: "test2" }
          ], this.callback);
          helpers.stdin.writeSequence(['n\n', 'y\n']);
        },
        "should respond with false" : function(err, result) {
          assert.isNull(err);
          assert.isFalse(result);
        }
      }
    }
  }
}).export(module);
