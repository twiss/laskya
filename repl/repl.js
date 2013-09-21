#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

function read(path) {
	return fs.readFileSync(path, 'utf-8');
}

var laskya = require(path.join(__dirname, '..', 'lib', 'laskya')).laskya;
var _ = laskya._;
var BigDecimal = laskya.BigDecimal;

laskya.addPredef('console', function() {
	console.log.apply(console, [].map.call(arguments, display));
}, 'functionentire');

if(process.argv[2]) {
	var contents = read(process.argv[2]);
	if(contents[0] + contents[1] === '#!') contents = contents.substr(contents.indexOf('\n'));
	return laskya.evaluate(contents);
}

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

var history = [];
laskya.addPredef('ans', function(t) {
	t = history.length - (t || 1);
	if(t >= 0 && t < history.length) return history[t];
	throw new RangeError('history item not found');
}, 'functionnon');

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
	var result, result_display, error;
	try {
		result = laskya.evaluate(input);
		result_display = display(result);
		history.push(result);
	} catch(e) {
		result = e;
		result_display = e.stack || e + '';
		error = true;
	}
	var tree_display = display(tree);
	if(tree_display !== input.replace(/\s|@/g, '') && tree_display !== result_display) {
		console.log('> ' + tree_display);
	}
	console.log('< ' + result_display + '\n');
	rl.prompt();
}).on('close', function() {
	process.exit(0);
});

function display(result, parent, rightHand, noParens) {
	var type;
	if(parent || (type = laskya.typeOf(result)) === 'tree') {
		var input = result;
		if(!input) return '';
		
		var visibleParens = showParens(input, parent, rightHand, noParens),
			ret = '';
		
		if(visibleParens) ret += '(';
		switch(input.type) {
			case 'id':
			case 'string':
			case 'regexp':
				ret += input.value;
				break;
			case 'number':
				ret += input.value.replace(/^\./, '0.');
				break;
			case 'operation':
				var op = input.value;
				if(op === '*' && input[0] && input[1] && (input[0].value === '€' || input[0].value === '$' || input[1].type === 'id' || (input[1].value === '^' && input[1][0].type === 'id') || showParens(input[1], input, true))) {
					op = '';
				}
				ret += display(input[0], input) + op + display(input[1], input, true);
				break;
			case 'invocation':
				var invocationParens = true,
					noArgs = false,
					between = '';
				if(input.args) {
					if(_.isArray(input.args)) {
						if((_.isString(input.value) ? input.value : input.value.value) === 'sqrt') {
							if(input.args[1]) {
								if(input.args[1].compareTo(BigDecimal.TWO)) {
									input.pro = [{type: 'const', value: display(input.args[1])}];
								}
								input.args = [input.args[0]];
							}
						}
						input.args = {type: 'const', value: input.args.map(display).join('\\text", "')};
					} else if(input.args.type === 'invocation') {
						invocationParens = false;
						between = ' ';
					}
				}
				var pro = '';
				if(input.pro) {
					pro += '_';
					_.each(input.pro, function(p, i) {
						if(i) pro += ', ';
						pro += display(p, input);
					});
				}
				ret += (_.isString(input.value) ? input.value : input.value.type === 'id' ? input.value.value : display(input.value, input)) + between + pro + (noArgs ? '' : (invocationParens ? '[' : '') + display(input.args) + (invocationParens ? ']' : ''));
				if(input.contents) {
					ret += display(input.contents);
				}
				break;
			case 'block':
				ret += '{' + display(input.contents) + '}';
				break;
			case 'const':
				if(_.isArray(input.value)) ret += input.value.join(', ');
				else if(_.isFunction(input.value)) ret += '(function)';
				else ret += input.value;
				break;
		}
		
		if(visibleParens) ret += ')';
		
		return ret;
	}
	switch(type) {
		case 'complexnumber':
			var op = '+';
			if(result.im.compareTo(BigDecimal.ZERO) === -1) {
				result.im = result.im.multiply(BigDecimal.M_ONE);
				op = '-';
			}
			var real = display(result.real),
				im = display(result.im);
			if(im === '0') return real;
			if(im === '1') im = '';
			return (real === '0' ? '' : real + ' ' + op + ' ') + im + 'i';
		case 'bignumber':
			return result.toString();
		case 'exactnumber':
			if(!(result.nom % 1 || result.den % 1)) {
				return result.nom.toString() + '/' + result.den.toString();
			}
			return result.toString();
		case 'bool':
			return result ? 'True' : 'False';
		case 'number':
			if(isNaN(result)) {
				return 'NaN';
			} else if(isFinite(result)) {
				//var fract = predefs.toFraction(result);
				return laskya.predefs.round(result, 12) + '';
			}
			return result + '';
		case 'function':
			return '(function' + (result.name ? ' ' + result.name : '') + ')';
		case 'string':
			var replaces = {
				'\\': /\\/g,
				n: /\n/g,
				r: /\r/g,
				t: /\t/g,
				b: /[\b]/g,
				f: /\f/g
			};
			_.each(replaces, function(char, regexp) {
				result = result.replace(regexp, '\\' + char);
			});
			return '"' + result + '"';
		case 'null':
			return 'Null';
		case 'list':
			var ret = '(',
				nfirst = false;
			_.each(result, function(v) {
				if(nfirst) ret += ', ';
				ret += display(v);
				nfirst = true;
			});
			return ret + ')';
		case 'solutions':
			var ret = '';
			_.each(result, function(varName, value) {
				ret += varName + ': ';
				if(laskya.typeOf(value) === 'oneof') {
					ret += value.toArray().map(display).join(' | ');
				} else {
					ret += display(value);
				}
				ret += '\n';
			});
			return ret;
		case 'hash':
			var ret = 'hash(',
				nfirst = false,
				ordered = [];
			_.each(result, function(k, v) {
				ordered.push([k, v]);
			});
			ordered.sort(function(a, b) {
				return a[0] < b[0] ? -1 : 1;
			});
			_.each(ordered, function(pair) {
				if(nfirst) ret += '; ';
				ret += '"' + pair[0] + '": ' + display(pair[1]);
				nfirst = true;
			});
			return ret + ')';
		case 'oneof':
			var ret = 'OneOf(';
			_.each(result.array, function(val, i) {
				if(i) ret += ', ';
				ret += display(val);
			});
			return ret + ')';
		default:
			return result + '';
	}
}

function showParens(input, parent, rightHand, noParens) {
	if(noParens || _.isNull(input) || _.isNull(parent)) {
		return false;
	}
	var pp = laskya.precedenceOf(parent),
		ip = laskya.precedenceOf(input);
	return input.type !== 'invocation' && parent.value !== '/' && (pp < ip || (pp === ip && (!!rightHand === (laskya.orderOf(input) !== 'right')) || (input.value === ',' && parent.value === ',' && input.isParens)));
}
