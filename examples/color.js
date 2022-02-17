var prompt = require("../lib/prompt");
var colors = require("@colors/colors/safe");
//
// Setting these properties customizes the prompt.
//
prompt.message = colors.rainbow("Question!");
prompt.delimiter = colors.green("><");

prompt.start();

prompt.get({
  properties: {
    name: {
      description: colors.magenta("What is your name?")
    }
  }
}, function (err, result) {
  console.log(colors.cyan("You said your name is: " + result.name));
});
