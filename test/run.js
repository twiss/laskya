#!/usr/bin/env node


// UTIL

var ok = true;

var fs = require('fs');
var fileCache = {};
function read(path) {
	return fileCache[path] || (fileCache[path] = fs.readFileSync(path, 'utf-8'));
}

var routinesDone = 0;
function routineDone() {
	if(++routinesDone === 2) {
		process.exit(ok ? 0 : 1);
	}
}

var columns = process.stdout.getWindowSize()[0];
function logTable(table) {
	var max = [],
		maxcols;
	_.each(table, function(row) {
		if(!maxcols) maxcols = Math.floor(columns / row.length);
		_.each(row, function(cell, i) {
			row[i] = row[i] ? row[i] + '' : '';
			if(!max[i] || row[i].length > max[i]) max[i] = Math.min(maxcols, row[i].length);
		});
	});
	_.each(table, function(row) {
		var log = '';
		_.each(row, function(cell, i) {
			log += cell + new Array(Math.max(2, max[i] - cell.length + 2)).join(' ');
		});
		console.log(log);
	});
	if(max.length) console.log('');
}


// INIT

var laskya = require('../lib/laskya');
var _ = laskya._;
var BigDecimal = laskya.BigDecimal;
laskya = laskya.laskya;


// CORE TESTS

function isParsedValue(result) {
	return (_.isArray(result) || _.isPlainObject(result)) && 'type' in result && 'value' in result;
}

function equal(a, b, approx) {
	if(!b) {
		return false;
	}
	if(b.type === 'const') {
		return equal(a, b.value, approx);
	}
	if(_.isString(a) && isParsedValue(b)) {
		return laskya.latex(b).replace(/\\html"[^"]*"/g, '') === a;
	}
	if(_.isArray(a) && b.array && a.length === b.array.length) {
		return _.each(a, function(v, i) {
			return equal(v, b.array[i], approx);
		});
	} else if(_.isPlainObject(a)) {
		return _.each(a, function(k, v) {
			return equal(v, b[k], approx);
		});
	} else if(_.isArray(a) && a.length === b.length) {
		return _.each(a, function(v, k) {
			return equal(v, b[k], approx);
		});
	} else if(approx) {
		return Math.abs(b - a) <= 0.01;
	} else if(laskya.typeOf(b) === 'complexnumber') {
		
		return !b.im.compareTo(BigDecimal.ZERO) && +b.real === a;
	} else {
		return +b === a;
	}
}

var tests = 0, failed = 0;
function test(input, expected, options) {
	tests++;
	try {
		var res = laskya.evaluate(input);
		if(!equal(expected, res, options && options.approx)) {
			table.push(['laskya.evaluate("' + input + '")', 'was ' + (res + '' === '[object Object]' ? JSON.stringify(res) : res) + ',', 'expected ' + JSON.stringify(expected)]);
			ok = false;
			failed++;
		}
	} catch(e) {
		table.push(['laskya.evaluate("' + input + '")', 'threw ' + e + ',', 'expected ' + JSON.stringify(expected)]);
		ok = false;
		failed++;
	}
}

var table = [];
test('6 * 8', 48);
test('2e', 5.4365637, {approx: true});
test('-3 - - 5 + - 1', 1);
test('(1+2)(1-2)', -3);
test('sin .723^2', 0.5, {approx: true});
//test('sin(2pi/6)', '${{√{3}}/{2}}$');
//test('sin^2(2pi/6)', 0.75);
test('-i', {real: 0, im: -1});
test('-i - 1', {real: -1, im: -1});
test('2 * 50% + 1', 2);
test('x+21%=242', {x: 200});
test('e^(i pi', -1);
test('pi*pi*pi', 31, {approx: true});
test('2pi + i', {real: 6.2831853071795864769, im: 1}, {approx: true});
test('x * 5% = x * 1.9% + .3', {x: 9.68}, {approx: true});
//test('x - 20% = 40', {x: 50});
test('6/10=1/x', {x: 1.6666667}, {approx: true});
test('x^2 - 3x = 0', {x: [0, 3]});
test('a² - 14a + 48 = 0', {a: [6, 8]});
//test('x^3−2·x^2−3x=0', {x: [-1, 0, 3]});
//test('a - b = 5 & a b = 50', {a: [-5, 10], b: [10, -5]});
test('x + 1/3x = 5', {x: 15/4});
//test('x + 1/(3x) = 5', '(15 ± √213) / 6');
test('[1/x^2]\'', '${{-2}/{{x}^{3}}}$');
//test('x+y^2=10 & x^2 = 4', 'no idea');
//test('x+y^2=10 & x y = 4', 'no idea');
//test('plot (x-2)^2((y-3)^2+abs(x-2)+abs(x-3)-1)^2((y-4)^2+abs(x-2)+abs(x-4)-2)^2+(y^2-6y+8+sqrt(y^4-12y^3+52y^2-96y+64))^2=0', 'should render an F');
test('toRepeatingFraction[20.1+1/7]', [1417, 70]);
logTable(table);

if(ok) {
	console.log('All tests passed!\n');
} else {
	console.log(failed + '/' + tests + ' tests failed.\n');
}


// REPL TEST

(function() {
	var repl = require('child_process').spawn('node', ['./repl/repl.js']);
	var repltests = read('doc/repl.md').match(/> .+\n\t< .+/g);
	var repltest = 0;
	var table = [];
	repl.stdout.on('data', function question(data) {
		var test = repltests[repltest].split('\n\t'),
			q = test[0].substr(2),
			a = test[1].substr(2);
		repl.stdout.removeListener('data', question);
		repl.stdout.on('data', function answer(data) {
			var result = data.toString().match(/< (.+)/);
			if(!result) return;
			repl.stdout.removeListener('data', answer);
			result = result[1];
			if(result !== a) {
				ok = false;
				table.push([test[0], 'was ' + result + ',', 'expected ' + a]);
			}
			repltest++;
			if(repltest === repltests.length) {
				repl.kill();
				logTable(table);
				console.log(table.length + '/' + repltests.length + ' tests failed.');
				routineDone();
			} else if(/\n> /.test(data)) {
				question();
			} else {
				repl.stdout.on('data', question);
			}
		});
		repl.stdin.write(q + '\n');
	});
	repl.on('close', function() {
		console.log('The REPL closed unexpectedly at test "' + repltests[repltest].split('\n\t')[0] + '".');
		ok = false;
		routineDone();
	});
})();


// CHECK CODE STYLE

var JSHINT = require('jshint').JSHINT;
var options = {
	smarttabs: true,
	undef: true,
	strict: true,
	trailing: true,
	node: true, // for the repl
	'-W004': true,
	'-W006': true,
	'-W007': true,
	'-W008': true,
	'-W018': true,
	'-W030': true,
	'-W065': true,
	//'-W086': true,
	//'-W093': true
};
var table = [];
_.each({
	'lib/laskya.js': {
		MathContext: true,
		BigDecimal: true,
		setTimeout: false,
		clearTimeout: false
	},
	'repl/repl.js': {}
}, function(path, globals) {
	var src = read(path);
	if(!JSHINT(src, options, globals)) {
		ok = false;
		for(var i = 0; i < JSHINT.errors.length; i++) {
			var error = JSHINT.errors[i];
			if(error) {
				table.push([path, 'line ' + error.line, 'col ' + error.character + ':', error.reason, error.evidence ? error.evidence.replace(/^\t+/, '') : '', '(' + error.code + ')']);
			}
		}
	}
	
	// Space-indented lines
	src.replace(/^ /gm, function(match, offset) {
		ok = false;
		table.push([path, 'line ' + src.substr(0, offset).split('\n').length + ':', , 'Indented with spaces']);
		return match;
	});
	
	// Lines that are not indented but should be
	src.replace(/\t+.*\n\n/g, function(match, offset) {
		ok = false;
		table.push([path, 'line ' + (src.substr(0, offset).split('\n').length + 1) + ':', , 'Not indented']);
		return match;
	});
});
logTable(table);

routineDone();
