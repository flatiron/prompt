/*
 * prompt-streamline._js: Example of how to use prompt with streamlinejs.
 *
 * calling syntax: _node prompt-streamline._js
 *
 */
var prompt = require('../lib/prompt');

function getSampleData(){
    return [
        {
            name: 'username',
            message: 'Enter a username'
        }
    ];
};

//
// Start the prompt
//
prompt.start();

function get_username_prompt(_){
    console.log(prompt.get(getSampleData(), _).username);
}

get_username_prompt(_);

//
// Clean the prompt
//
prompt.stop();