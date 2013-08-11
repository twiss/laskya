#!/usr/bin/env node

var stop = false;
process.argv.forEach(function(arg) {
	if(arg === '--help') {
		require('child_process').spawn('less', ['--prompt=Help text line %lt of %L ?e(END) .(press h for help or q to quit)', 'doc/repl.md'], {
			customFds: [0, 1, 2]
		});
		stop = true;
	}
});
if(stop) return;

console.log('Welcome to the Laskya REPL! See laskya --help for help.');

var fs = require('fs');
var path = require('path');

function read(path) {
	return fs.readFileSync(path, 'utf-8');
}

eval(read(path.join(__dirname, '..', '3rdparty', 'mathcontext.js')));
eval(read(path.join(__dirname, '..', '3rdparty', 'bigdecimal.js')));
eval('(function() { ' + read(path.join(__dirname, '..', 'lib', 'laskya.js')) + ' })();');

var readline = require('readline'),
	rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		completer: function(line) {
			var scopes = laskya.scopes;
			var hits = [];
			var id = line.match(/\$?[a-z][\$a-z0-9]*$/i);
			if(id) id = id[0];
			else id = '';
			for(var i = 0; i < scopes.length; i++)
				for(var j in scopes[i])
					if(scopes[i].hasOwnProperty(j) && j.indexOf(id) === 0)
						hits.push(j);
			return [hits.sort(), id];
		}
	});

rl.setPrompt('> ');
rl.prompt();

rl.on('line', function(input) {
	var tree = laskya.parse(laskya.tokenize(input));
	try {
		var result = laskya.evaluate(input);
		var result_export = laskya.export_result(result);
	} catch(e) {
		var result = e;
		var result_export = e + '';
		var error = true;
	}
	var tree_export = laskya.export_result(tree);
	if(tree_export !== input.replace(/\s|@/g, '') && tree_export !== result_export) {
		console.log('> ' + tree_export);
	}
	if(laskya.typeof_result(result) === 'solutions') {
		
	} else {
		console.log('< ' + result_export + '\n');
	}
	rl.prompt();
}).on('close', function() {
	process.exit(0);
});