(function(global, undefined) {
	"use strict";
	// Convenience functions
	var _ = global._ = {};
	_.each = function(list, fn) {
		var result, i;
		if(_.isArray(list)) {
			for(i = 0; i < list.length; i++) if((result = fn(list[i], i)) === false) break;
		} else {
			for(i in list) if(_.hasOwn(list, i) && (result = fn(i, list[i])) === false) break;
		}
		return result;
	};
	_.extend = _.merge = function(obj, key, value) {
		if(_.isPlainObject(key)) {
			_.each(key, function(k, v) {
				obj[k] = _.clone(v);
			});
		} else {
			obj[key] = _.clone(value);
		}
		return obj;
	};
	_.implement = function(obj, key, value) {
		_.extend(obj.prototype, key, value);
	};
	_.clone = function(obj) {
		if(!_.isArray(obj) && !_.isPlainObject(obj)) return obj;
		return _.extend({}, obj);
	};
	_.hasOwn = function(obj, key) {
		return !_.isNull(obj) && obj.hasOwnProperty(key);
	};
	_.isNull = function(obj) {
		return obj === undefined || obj === null;
	};
	// From jQuery
	_.isPlainObject = function(obj) {
		if(!obj || Object.prototype.toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval) {
			return false;
		}
		try {
			if(obj.constructor && !_.hasOwn(obj, 'constructor') && !_.hasOwn(obj.constructor.prototype, 'isPrototypeOf') ) {
				return false;
			}
		} catch (e) {
			return false;
		}
		var key;
		for(key in obj) {}
		return key === undefined || _.hasOwn(obj, key);
	};
	_.isArray = function(obj) {
		return Object.prototype.toString.call(obj) === '[object Array]';
	};
	_.isFunction = function(obj) {
		return Object.prototype.toString.call(obj) === '[object Function]';
	};
	_.isNumber = function(obj) {
		return Object.prototype.toString.call(obj) === '[object Number]';
	};
	_.isString = function(obj) {
		return Object.prototype.toString.call(obj) === '[object String]';
	};
	_.toArray = function(elm) {
		return elm && _.isFunction(elm.toArray) ? elm.toArray() : _.isArray(elm) ? elm : [elm];
	};
	Array.prototype.contains = function(val) {
		return _.each(this, function(elm) { return elm !== val; }) === false;
	};
	
	var BigDecimal_sqrt = BigDecimal.prototype.sqroot;
	BigDecimal.prototype.sqroot = function() {
		if(this.compareTo(ZERO) === -1) return new ComplexNumber(0, BigDecimal_sqrt.call(this.multiply(M_ONE)));
		var sqrt = BigDecimal_sqrt.call(this);
		if(laskya.maintain) {
			try {
				sqrt.intValueExact();
				return sqrt;
			} catch(e) {
				laskya.isExactResult = true;
				throw new ReferenceError('sqrt ' + this + ' is not a simple number');
			}
		}
		return sqrt;
	};
	_.each(['add', 'subtract', 'multiply', 'divide', 'pow', 'floor', 'ceil', 'sqroot', 'abs', 'ln'], function(name) {
		_.implement(Number, name, function() {
			if(!isFinite(this)) return this;
			return BigDecimal.prototype[name].apply(toBigDecimal(this), arguments);
		});
	});
	_.implement(Number, {
		compareTo: function(b) {
			if(this < b) return -1;
			if(this > b) return 1;
			return 0;
		},
		remainder: function(n) {
			return this % n;
		}
	});
	_.implement(String, {
		add: function(str) {
			return this + str;
		},
		multiply: function(n) {
			var str = '';
			for(var i = 0; i < n; i++) {
				str += this;
			}
			return str;
		},
		trim0: function() {
			return this.replace(/(\.(\d*?))0+($|E)/, '$1$3').replace(/\.($|E)/, '$1');
		}
	});
	
	_.implement(Array, 'flatten', function() {
		return _.flatten(this);
	});
	_.implement(BigDecimal, {
		floor: function() {
			return this.round({
				digits: this.mant.length + this.exp,
				roundingMode: MathContext.prototype.ROUND_FLOOR
			});
		},
		ceil: function() {
			return this.round({
				digits: this.mant.length + this.exp,
				roundingMode: MathContext.prototype.ROUND_CEILING
			});
		}
	});
	BigDecimal.prototype.valueOf = function() {
		return parseFloat(this.toString());
	};
	
	var OrigBigDecimalPrototype = {};
	_.each(['divide', 'floor', 'ceil', 'abs', 'ln', 'log2', 'log10'], function(name, i) {
		OrigBigDecimalPrototype[name] = BigDecimal.prototype[name];
		BigDecimal.prototype[name] = i ? function() {
			return OrigBigDecimalPrototype[name].call(this, set(this));
		} : function(n) {
			return OrigBigDecimalPrototype[name].call(this, n, set(this, n));
		};
	});
	var ExactNumber = function(nom, den) {
		this.nom = toBigDecimal(nom);
		this.den = toBigDecimal(den);
	};
	_.implement(ExactNumber, {
		add: function(val) {
			if(!(val instanceof ExactNumber)) val = new ExactNumber(val, 1);
			return new ExactNumber(this.nom.multiply(val.den).add(val.nom.multiply(this.den)), this.den.multiply(val.den));
		},
		subtract: function(val) {
			if(!(val instanceof ExactNumber)) val = new ExactNumber(val, 1);
			return new ExactNumber(this.nom.multiply(val.den).subtract(val.nom.multiply(this.den)), this.den.multiply(val.den));
		},
		multiply: function(val) {
			if(!(val instanceof ExactNumber)) val = new ExactNumber(val, 1);
			return new ExactNumber(this.nom.multiply(val.nom), this.den.multiply(val.den));
		},
		divide: function(val) {
			if(!(val instanceof ExactNumber)) val = new ExactNumber(val, 1);
			return new ExactNumber(this.nom.multiply(val.den), this.den.multiply(val.nom));
		},
		remainder: function(val) {
			return this % val;
		},
		pow: function(val) {
			val = toBigDecimal(val);
			return new ExactNumber(this.nom.pow(val), this.den.pow(val));
		},
		floor: function() {
			return this.nom.divideInteger(this.den);
		},
		ceil: function() {
			return this.toBigDecimal().ceil();
		},
		sqroot: function() {
			return new ExactNumber(this.nom.sqroot(), this.den.sqroot());
		},
		abs: function() {
			return new ExactNumber(this.nom.abs(), this.den.abs());
		},
		ln: function() {
			return this.toBigDecimal().ln();
		},
		toBigDecimal: function() {
			return this.nom.divide(this.den);
		}
	});
	ExactNumber.prototype.toString = function() {
		return this.toBigDecimal().toString();
	};
	ExactNumber.prototype.valueOf = function() {
		return +this.toBigDecimal();
	};
	global.ExactNumber = ExactNumber;
	
	var ComplexNumber = function(real, im) {
		this.real = toBigDecimal(real);
		this.im = toBigDecimal(im);
	};
	_.implement(ComplexNumber, {
		add: function(val) {
			if(!(val instanceof ComplexNumber)) val = new ComplexNumber(val, ZERO);
			return new ComplexNumber(this.real + val.real, this.im + val.im);
		},
		subtract: function(val) {
			if(!(val instanceof ComplexNumber)) val = new ComplexNumber(val, ZERO);
			return new ComplexNumber(this.real.subtract(val.real), this.im.subtract(val.im));
		},
		multiply: function(val) {
			if(!(val instanceof ComplexNumber)) val = new ComplexNumber(val, ZERO);
			return new ComplexNumber(this.real.multiply(val.real).subtract(this.im.multiply(val.im)), this.im.multiply(val.real).add(this.real.multiply(val.im)));
		},
		divide: function(val) {
			if(!(val instanceof ComplexNumber)) val = new ComplexNumber(val, ZERO);
			var divident = val.real * val.real + val.im * val.im;
			return new ComplexNumber((this.real * val.real + this.im * val.im) / divident, (this.im * val.real - this.real * val.im) / divident);
		},
		pow: function(b) {
			if(!(b instanceof ComplexNumber)) b = new ComplexNumber(b, ZERO);
			var a = this;
			var ss = a.real.multiply(a.real).add(a.im.multiply(a.im));
			var arg1 = toBigDecimal(Math.atan2(a.im, a.real));
			var pow_right_hand = b.real.divide(TWO);
			var mag;
			if(pow_right_hand % 1) {
				mag = Math.pow(ss, pow_right_hand);
			} else {
				mag = ss.pow(pow_right_hand);
			}
			ss = ss.multiply(toBigDecimal(Math.exp(b.im.multiply(M_ONE).multiply(arg1))));
			//var arg = b.real*arg1 + (b.im * Math.log(ss))/2;
			var arg = b.real.multiply(arg1).add(b.im.multiply(toBigDecimal(Math.log(ss))).divide(TWO));
			var real = mag.multiply(toBigDecimal(Math.cos(arg))),
				im = mag.multiply(toBigDecimal(Math.sin(arg)));
			return new ComplexNumber(real.finish(approxset(real)), im.finish(approxset(im)));
		},
		floor: function() {
			return new ComplexNumber(this.real.floor(), this.im.floor());
		},
		ceil: function() {
			return new ComplexNumber(this.real.ceil(), this.im.ceil());
		},
		sqroot: function() {
			var abs = this.abs();
			return new ComplexNumber(Math.sqrt((abs + this.real) / 2), (this.im < 0 ? -1 : 1) * Math.sqrt((abs - this.real) / 2));
		},
		abs: function() {
			var real = this.real,
				im = this.im;
			return Math.sqrt(real * real + im * im);
		},
		angle: function(){
			return Math.atan2(this.im, this.real);
		},
		exp: function() {
			return new ComplexNumber(Math.exp(this.real), this.im);
		},
		ln: function() {
			return new ComplexNumber(Math.log(this.abs()), this.angle());
		}
	});
	ComplexNumber.prototype.toString = function() {
		var real = this.real,
			im = this.im;
		if(!im) return real;
		if(+im === 1) im = '';
		if(!+real) return im + 'i';
		return '(' + real + '+' + im + 'i)';
	};
	global.ComplexNumber = ComplexNumber;
	
	var Range = function(from, to, inclusive) {
		this.from = from;
		this.to = to;
		this.inclusive = !!inclusive;
	};
	Range.prototype.contains = function(n) {
		return n >= this.from && (this.inclusive ? (n <= this.to) : (n < this.to));
	};
	Range.prototype.toString = function() {
		return '<span class="type">(range)</span> ' + this.from + ' ~' + (this.inclusive ? '~' : '') + ' ' + this.to + ' (' + (this.inclusive ? 'in' : 'ex') + 'clusive)';
	};
	var Raw = function(val) {
		this.value = val;
	};
	Raw.prototype.toString = function() {
		return this.value;
	};
	var Solutions = function(varName, value) {
		if(varName) {
			this[varName] = value;
		}
	};
	Solutions.prototype.addSolution = function(varName, solutions) {
		if(solutions) {
			this[varName] = new OneOf(_.toArray(this[varName]).concat(_.toArray(solutions)));
		}
	};
	Solutions.prototype.addSolutions = function(solutions) {
		_.extend(this, solutions);
	};
	Solutions.prototype.operate = function(operator, argument, input) {
		var sol = new Solutions();
		_.each(this, function(varName, v) {
			sol[varName] = operate(operator, v, argument, input);
		});
		return sol;
	};
	Solutions.prototype.empty = function() {
		return _.each(this, function() {
			return false;
		}) !== false;
	};
	var compareValue = function(a, b) {
		if(a && b && a.type === 'const' && b.type === 'const') return compareValue(a.value, b.value);
		return a instanceof BigDecimal && b instanceof BigDecimal ? a.compareTo(b) :
			   a < b ? -1 :
			   a === b ? 0 : 1;
	};
	var OneOf = function(array, sort) {
		this.array = sort ? array.sort(compareValue) : array;
	};
	OneOf.prototype.toArray = function() {
		return this.array;
	};
	OneOf.prototype.operate = function(operator, argument, input, reverse) {
		if(!reverse && operator === '#') return this.array[calculate(argument)];
		return new OneOf(this.array.map(reverse ? function(v) {
			return operate(operator, argument, constObj(v), input);
		} : function(v) {
			return operate(operator, constObj(v), argument, input);
		}));
	};
	_.each({
		add: '+',
		subtract: '-',
		multiply: '*'
	}, function(name, operator) {
		OneOf.prototype[name] = function(argument) {
			return new OneOf(this.array.map(function(v) {
				return operate(operator, constObj(v), constObj(argument), {});
			}));
		};
	});
	OneOf.prototype.toString = function() {
		return this.array.join('<span class="type"> or </span>');
	};
	OneOf.prototype.sqroot = function() {
		return new OneOf(this.array.map(function(v) {
			return v.sqroot();
		}));
	};
	var closure = function(fn, scope) {
		return function() {
			scopes.push(scope);
			var result = fn.apply(this, arguments);
			scopes.pop();
			return result;
		};
	};
	
	function Unit(short, type, conversion) {
		this.short = short;
		this.type = type;
		this.conversion = conversion;
	}
	Unit.prototype.multiply = function(val) {
		return new Unit(this.short + '*' + val.short, this.type + '*' + val.type, this.conversion * val.conversion);
	};
	Unit.prototype.pow = function(val) {
		if(units[this.short + +val]) return units[this.short + +val];
		return new Unit(this.short + '^' + +val, this.type + '^' + +val, this.conversion.pow(val));
	};
	Unit.prototype.toString = function() {
		return this.short.replace(/(\w*)\*\1/, '$1<sup>2</sup>').replace(/(\w*)\^(\d*)/, '$1<sup>$2</sup>');
	};
	
	var units = {
		usd: new Unit('$', 'money', 1),
		eur: new Unit('€', 'money', 1.29582),
		mm: new Unit(' mm', 'length', .001),
		cm: new Unit(' cm', 'length', .01),
		meter: new Unit(' m', 'length', 1),
		inch: new Unit('"', 'length', 0.0254),
		feet: new Unit('ft', 'length', 0.3048),
		kg: new Unit(' kg', 'mass', 1),
		tonne: new Unit(' t', 'mass', 1000),
		L: new Unit(' L', 'volume', .001),
		m3: new Unit(' m^3', 'volume', 1),
		rad: new Unit(' rad', 'angle', 1),
		deg: new Unit('&deg;', 'angle', Math.PI / 180)
	};
	
	function Value(amount, unit) {
		this.amount = amount;
		this.unit = unit;
	}
	Value.prototype.valueOf = function() {
		return this.amount;
	};
	Value.prototype.toString = function() {
		return this.amount + this.unit.toString();
	};
	Value.prototype.convert = function(unit) {
		if(this.unit.type !== unit.type) throw new TypeError(this.unit.short + ' and ' + unit.short + ' are incompatible');
		return new Value(this.unit.conversion / unit.conversion * this.amount, unit);
	};
	
	var main_units = {
		money: units.usd,
		length: units.meter
	};
	
	var Percentage = function(points) {
		this.frac = points.divide(HUNDRED);
	};
	Percentage.prototype.valueOf = function() {
		return +this.frac;
	};
	
	Percentage.prototype.toString = function() {
		return display(this.frac.multiply(HUNDRED)) + '%';
	};
	
	var $return = new SyntaxError('Illegal return statement'),
		$break = new SyntaxError('Illegal break statement'),
		$continue = new SyntaxError('Illegal continue statement'),
		Impure = new Error('Attempted to run impure code twice.'),
		toBigDecimal = function(n) {
			if(n instanceof BigDecimal) return n;
			if(n && n.toBigDecimal) return n.toBigDecimal();
			return new BigDecimal(+n + '');
		},
		toExactNumber = function(n) {
			return n instanceof OneOf || n instanceof ExactNumber ? n : new ExactNumber(n, 1);
		},
		settings = {},
		tokenize = function(input) {
			input = input.replace(/ʺ/g, '"'); // needs to go first, because quotes come in pairs
			var tokens = [],
				tokenTypes = {
					comment: /^\/\/[^\n]*/,
					alternative: /^(\*\*|√|²|×|·|−|→|′|π|±)/,
					number: /^(0x[0-9a-f]+|0b([01]+)|0\d+|((\d+(\.\d+)?|(\.\d+))(e[+-]?\d+)?))/i,
					operator: /^(\^+|!=|<=|>=|\^\^|::|->|((in|of|to|and|or|xor|not|mod|plusminus)(?![a-zA-Z]))|[-+*\/\\^]:|\+\+|--|\.{1,3}|~=|[-+*\\\/()[\]{},;=<>!&|?:#~_%'@])/, // :=
					id: /^(\$?[a-z][\$a-z0-9]*|€|\$)/i,
					string: /^"([^\\"]|\\.)*"/,
					regexp: /^`(([^\\`]|\\.)*)`([a-z]*)/,
					space: /^[\s\u200B]+/
				},
				i,
				inputLen = input.length,
				tokenTypesLen = tokenTypes.length,
				match,
				value,
				matchLen,
				newToken,
				alternatives = {
					'**': '^',
					'√': ' sqrt ',
					'²': '^2',
					'×': '*',
					'·': '*',
					'−': '-',
					'→': '->',
					'′': "'",
					'π': ' pi ',
					'±': ' plusminus '
				};
			function checkTokenType(type, regExp) {
				match = input.substr(i).match(regExp);
				if(match) {
					value = match[0];
					matchLen = value.length;
					if(matchLen) {
						if(type === 'alternative') {
							input = input.replace(value, alternatives[value]);
							inputLen = input.length;
							return;
						} else if(type !== 'space' && type !== 'comment') {
							newToken = {
								type: type,
								value: value
							};
							if(type === 'number' || type === 'regexp') {
								newToken.match = match;
							}
							tokens.push(newToken);
						}
						i += matchLen;
						return false;
					} else {
						match = false;
					}
				}
			}
			for(i = 0; i < inputLen; ) {
				_.each(tokenTypes, checkTokenType);
				if(!match) {
					throw new SyntaxError("unexpected '" + input[i] + "' at character " + i + " (charcode " + input.charCodeAt(i) + ")");
				}
			}
			return tokens;
		},
		precedenceOf = function(token) {
			if(token.precedence) {
				return token.precedence;
			}
			if(token.type === 'number' && /e/i.test(token.value)) {
				return 4;
			}
			var input = token.value;
			if(input === '**') {
				input = '^';
			}
			return input && input.charAt ? ({
				'not': 2,
				'and': 2,
				'or': 2,
				'xor': 2,
				'plusminus': 5,
				'mod': 6,
				'..': 6,
				'...': 6,
				'!=': 9,
				'~=': 9,
				'in': 9,
				'of': 9,
				'to': 9,
				'->': 12,
				':': 13
			}[input] || {
				'@': 0,
				'_': 0,
				'#': 1,
				'.': 1,
				"'": 1,
				'~': 2,
				'!': 2,
				'^': 3,
				'%': 3,
				'*': 4,
				'/': 4,
				'\\': 4,
				'+': 5,
				'-': 5,
				',': 8,
				'=': 9,
				'<': 9,
				'>': 9,
				'&': 10,
				'|': 10,
				'?': 11,
				';': 14
			}[input.charAt(0)]) : 1;
		},
		orderOf = function(token) {
			return ['^', '~', '?', ':', '->'].contains(token.value) ? 'right' : 'left';
		},
		fixOf = function(token) {
			var val = token.value;
			return ['@', '~', 'not'].contains(val) ? 'pre' :
				   ['!', '++', '--', "'", '%'].contains(val) ? 'post' :
				   'in';
		},
		handleOp = function(input, i, token) {
			var fix = fixOf(token),
				left = i - 1,
				right = i + 1,
				rLen = 1,
				noLeft = fix === 'pre' || left < 0 || !isValue(input[left]),
				operation;
			if(fix === 'post' || right >= input.length) {
				rLen = 0;
			} else {
				while(input[i + rLen] && input[i + rLen].type === 'operator' && (input[i + rLen].value === '+' || input[i + rLen].value === '-')) rLen++;
			}
			if(rLen === 1 && !isValue(input[right])) {
				rLen = 0;
			}
			if(token.value === '@') {
				operation = input[right];
				if(!operation) {
					throw new SyntaxError("missing right operand for '@'");
				}
				operation.invocable = false;
			} else {
				operation = {
					type: 'operation',
					value: token.value,
					0: noLeft ? undefined : input[left],
					1: rLen === 0 ? undefined : rLen === 1 ? input[right] : parse(input.slice(right, right + rLen))
				};
			}
			return (left >= 0 ? input.slice(0, noLeft ? i : left) : []).concat([operation]).concat(input.slice(i + rLen + 1));
		},
		handleParens = function(input, startChar, endChar, handler, bothRequired) {
			var parenStart,
				parenEnd,
				parenLevel = 0;
			_.each(input, function(token, i) {
				if(token.value === startChar && (startChar !== endChar || !parenLevel || (input[i - 1].type === 'operator' && input[i - 1].value !== '|' && fixOf(input[i - 1]) === 'in'))) {
					if(_.isNull(parenStart)) {
						parenStart = i;
					}
					parenLevel++;
				} else if(token.value === endChar) {
					parenLevel--;
					if(parenLevel <= 0) {
						parenEnd = i;
						return false;
					}
				}
			});
			if(!_.isNull(parenStart) || !_.isNull(parenEnd)) {
				if(_.isNull(parenStart)) {
					if(bothRequired) return input;
					parenStart = -1;
				}
				if(_.isNull(parenEnd)) {
					if(bothRequired) return input;
					parenEnd = input.length;
				}
				var contents = parse(input.slice(parenStart + 1, parenEnd));
				if(handler) {
					contents = handler(contents);
				} else {
					contents = setflag(contents, 'isParens');
				}
				return parse((parenStart < 0 ? [] : input.slice(0, parenStart)).concat(contents).concat(input.slice(parenEnd + 1)));
			}
			return input;
		},
		parse = function(input) {
			var inputLen = input.length,
				i,
				token,
				opFound,
				obj,
				parenLevel,
				lastStatementI = 1;
			input = handleParens(input, '{', '}', function(contents) {
				return [{
					type: 'block',
					contents: contents,
					scopeclosed: contents.type === 'block'
				}];
			});
			input = handleParens(input, '(', ')');
			input = handleParens(input, '|', '|', function(contents) {
				return [invocation('abs', contents)];
			}, true);
			inputLen = input.length;
			for(i = inputLen - 1; i >= 0; i--) {
				token = input[i];
				if(i < 2 || input[i - 1].value !== '.') {
					try {
						obj = getVar(token.value);
					} catch(e) {
						obj = {};
					}
				}
				if(((isInvocableValue(token) && (i + 1 === inputLen || input[i + 1].value !== "'") && (i <= 0 || input[i - 1].value !== '@')) && ((obj && token.type !== 'invocation' && _.isFunction(obj)) || (i + 1 !== inputLen && input[i + 1].value === '[')) && (i + 1 === inputLen || input[i + 1].value !== '_')) || (token.type === 'operation' && token.value === '_')) {
					var j,
						k;
					if(getflag(obj, 'functionblock')) {
						var argEnd;
						parenLevel = 0;
						for(j = i + 1; j < inputLen; j++) {
							if(!argEnd && input[j].value === '[') {
								parenLevel++;
							} else if(!argEnd && input[j].value === ']') {
								parenLevel--;
								if(!parenLevel) {
									argEnd = j;
								}
							} else if(input[j].type === 'block') {
								argEnd = j - 1;
								j++;
								break;
							} else if(argEnd && input[j].value === ';') {
								break;
							}
						}
						if(argEnd) {
							var contentsEnd = j,
								blockEnd = j,
								before = getflag(obj, 'functionbefore');
							if(before) {
								if(j < inputLen && before.contains(input[j].value)) {
									blockEnd += 2;
								}
							}
							return parse(input.slice(0, i).concat([_.merge(getInvocationObject(token), {
								args: parse(input.slice(i + 1, argEnd + 1)),
								contents: parse(input.slice(argEnd + 1, contentsEnd)),
								after: blockEnd > j ? {
									value: input[contentsEnd].value,
									contents: input[j + 1]
								} : null
							})]).concat(input.slice(blockEnd)));
						}
					} else if(getflag(obj, 'functionnon')) {
						j = i + 1;
					} else if((j = i + 1) < inputLen && input[j].value === '[') {
						for(parenLevel = 1, j++; j < inputLen && parenLevel; j++) {
							if(input[j].value === '[') {
								parenLevel++;
							} else if(input[j].value === ']') {
								parenLevel--;
							}
						}
					} else if(getflag(obj, 'functionentire')) {
						for(j = i + 1; j < inputLen && input[j].value !== ';' && input[j].value !== '}'; j++) {}
					} else {
						var isMath = isMathFunction(input[i].value);
						for(k = j = i + 1; j < inputLen && !(j - 1 === k && input[j - 1].isParens) && (isValue(input[j]) || input[j].value === ',' || ((j === k || !isValue(input[j - 1])) && (fixOf(input[j]) === 'pre' || input[j].value === '-')) || (isMath && precedenceOf(input[j]) < 4)); j++) {}
					}
					if(j < inputLen && input[j].value === ':') {
						continue;
					}
					/*if(i > 1 && input[i - 1].value === '.') {
						return parse(input.slice(0, i - 2).concat([_.merge(getInvocationObject(parse(input.slice(i - 2 - (input[i - 3] && input[i - 3].value === '@' ? 1 : 0), i + 1))), {
							args: parse(input.slice(i + 1, j)),
							thisObj: input[i - 2]
						})]).concat(input.slice(j)));
					}*/
					return parse(input.slice(0, i).concat([_.merge(getInvocationObject(token), {
						args: parse(input.slice(i + 1, j))
					})]).concat(input.slice(j)));
				}
			}
			input = handleParens(input, '[', ']');
			inputLen = input.length;
			function checkOperator(token, i) {
				if(precedence === 4 && i + 1 < inputLen && isValue(token) && isValue(input[i + 1])) {
					input.splice(i + 1, 0, {
						type: 'operator',
						value: '*'
					});
					opFound = true;
					return false;
				}
				if(token.type === 'operator' && precedenceOf(token) === precedence && orderOf(token) === 'left') {
					input = handleOp(input, i, token);
					opFound = true;
					return false;
				}
			}
			for(var precedence = 0; precedence < 15; precedence++) {
				if(_.each(input, checkOperator) !== false) {
					for(i = inputLen - 1; i >= 0; i--) {
						token = input[i];
						if(token.type === 'operator' && precedenceOf(token) === precedence && orderOf(token) === 'right') {
							input = handleOp(input, i, token);
							opFound = true;
							break;
						}
					}
				}
				if(opFound) {
					return parse(input);
				}
			}
			if(input.length === 1 && !input.type) {
				return input[0];
			}
			return input;
		},
		memoize = function(f) {
			var cache = {};
			return function(arg) {
				return cache[arg] || (cache[arg] = f.apply(this, arguments));
			};
		},
		setflag = function(obj, flag) {
			obj[flag] = true;
			return obj;
		},
		setflags = function(obj) {
			var args = arguments;
			for(var i = 1; i < args.length; i++) {
				if(_.isArray(args[i])) {
					obj[args[i][0]] = args[i][1];
				} else {
					obj[args[i]] = true;
				}
			}
			return obj;
		},
		getflag = function(obj, flag) {
			return obj[flag];
		},
		log10 = Math.log(10),
		set = function(a, b) {
			return {
				digits: (b ? Math.max(a.mant.length, b.mant.length) : a.mant.length) + 30,
				roundingMode: MathContext.prototype.ROUND_HALF_UP,
				form: MathContext.prototype.PLAIN
			};
		},
		approxset = function(a) {
			var digits = a.mant.length + a.exp + 15;
			return {
				digits: digits ? digits : -1,
				roundingMode: MathContext.prototype.ROUND_HALF_UP,
				form: MathContext.prototype.PLAIN
			};
		},
		finishset = function(a, b) {
			return {
				digits: (b ? Math.max(a.mant.length, b.mant.length) : a.mant.length + a.exp) + 5,
				roundingMode: MathContext.prototype.ROUND_HALF_UP,
				form: MathContext.prototype.PLAIN
			};
		},
		scientificset = {
			digits: 9,
			roundingMode: MathContext.prototype.ROUND_HALF_UP,
			form: MathContext.prototype.SCIENTIFIC
		},
		ZERO = BigDecimal.prototype.ZERO,
		ONE = BigDecimal.prototype.ONE,
		TWO = new BigDecimal('2'),
		FOUR = new BigDecimal('4'),
		HUNDRED = new BigDecimal('100'),
		M_ONE = new BigDecimal('-1'),
		consts = {
			True: true,
			False: false,
			Null: null,
			Infinity: Infinity,
			NaN: NaN
		},
		isConst = function(val) {
			return val === 'True' || val === 'False' || val === 'Null' || val === 'Infinity' || val === 'NaN';
		},
		isNotSimple = function(val) {
			return val === 'pi' || val === 'e' || val === 'phi';
		},
		startTimes = {},
		scopes = [{}, _.merge((function() {
			var obj = {};
			_.each(['abs', 'exp', 'max', 'min', 'pow', 'random'], function(name) {
				obj[name] = Math[name];
			});
			return obj;
		})(), {
			e: BigDecimal.prototype.E,
			phi: new BigDecimal('1.618033988749894848204586834366'),
			pi: BigDecimal.prototype.PI,
			i: new ComplexNumber(0, 1),
			usd: units.usd,
			dollar: units.usd,
			$: units.usd,
			eur: units.eur,
			euro: units.eur,
			'€': units.eur,
			kg: units.kg,
			tonne: units.tonne,
			mm: units.mm,
			cm: units.cm,
			m: units.meter,
			meter: units.meter,
			inch: units.inch,
			ft: units.feet,
			feet: units.feet,
			l: units.L,
			L: units.L,
			deg: units.deg,
			rad: units.rad,
			add: function() {
				var result = 0;
				_.each(arguments, function(x) {
					result += x;
				});
				return result;
			},
			multiply: function() {
				var result = 1;
				_.each(arguments, function(x) {
					result *= x;
				});
				return result;
			},
			sinh: function(x) {
				return (Math.exp(x) - Math.exp(-x)) / 2;
			},
			asinh: function(x) {
				return Math.log(x + Math.sqrt(1 + Math.pow(x, 2)));
			},
			cosh: function(x) {
				return (Math.exp(x) + Math.exp(-x)) / 2;
			},
			acosh: function(x) {
				return Math.log(x + Math.sqrt(x + 1) * Math.sqrt(x - 1));
			},
			tanh: function(x) {
				var ex = Math.exp(2 * x);
				return (ex - 1) / (ex + 1);
			},
			atanh: function(x) {
				return Math.log((1 + x) / (1 - x)) / 2;
			},
			csch: function(x) {
				return 2 / (Math.exp(x) - Math.exp(-x));
			},
			acsch: function(x) {
				return Math.log(Math.sqrt(1 + 1 / (x * x)) + 1 / x);
			},
			sech: function(x) {
				return 2 / (Math.exp(x) + Math.exp(-x));
			},
			asech: function(x) {
				var r = 1 / x;
				return Math.log(Math.sqrt(r - 1) * Math.sqrt(r + 1) + r);
			},
			coth: function(x) {
				var ex = Math.exp(2 * x);
				if(ex === 1) {
					return NaN;
				}
				return (ex + 1) / (ex - 1);
			},
			acoth: function(x) {
				return Math.log((x + 1) / (x - 1)) / 2;
			},
			degToRad: function(x) {
				return x instanceof BigDecimal && !laskya.approximate ? x.multiply(BigDecimal.prototype.PI).divide(new BigDecimal('180')) : x * Math.PI / 180;
			},
			radToDeg: function(x) {
				return x instanceof BigDecimal && !laskya.approximate ? x.multiply(new BigDecimal('180')).divide(BigDecimal.prototype.PI) : x * 180 / Math.PI;
			},
			ans: setflag(function(t) {
				try {
					return hist[hist.length - (t || 1)].o;
				} catch(e) {
					throw new RangeError('history item not found');
				}
			}, 'functionnon'),
			round: function(value, precision) {
				value = toBigDecimal(value);
				return value.round({
					digits: value.mant.length + value.exp + (precision || 0),
					roundingMode: MathContext.prototype.ROUND_HALF_UP
				});
			},
			floor: function(value) {
				return value.floor();
			},
			ceil: function(value) {
				return value.ceil();
			},
			sqrt: function(n, b) {
				if(_.isNull(b) || +b === 2) {
					if(laskya.approximate && +n !== Infinity) return Math.sqrt(n);
					if(+n === 0) return ZERO;
					return n.sqroot();
				} else if(+b) {
					var root = Math.pow(n, 1 / b);
					if(laskya.maintain && root % 1) {
						laskya.isExactResult = true;
						throw new ReferenceError('sqrt_' + b + ' ' + n + ' is not a simple number');
					}
					return root;
				}
				return NaN;
			},
			lambertW: function(x) {
				var w = 1,
					e = Math.E,
					ew,
					wewx;
				for(var i = 0; i < 5; i++) {
					ew = Math.pow(e, w);
					wewx = w * ew - x;
					w -= wewx / ((w + 1) * ew - (w + 2) * wewx / (2 * w + 2));
				}
				return w;
			},
			/*lambertW: function(x) {
				var w = 1,
					e = Math.E,
					e_w,
					e_w_x,
					w_e_w_x;
				for(var i = 0; i < 5; i++) {
					e_w = Math.pow(e, w);
					e_w_x = e_w - x;
					w_e_w_x = w * e_w_x;
					w -= w_e_w_x / ((w + 1) * e_w - (w + 2) * w_e_w_x / (2 * w + 2));
				}
				return w;
			},*/
			log: function(n, b) {
				if(n < 0) {
					if(laskya.maintain) {
						laskya.exactReturnInput = this.input;
						laskya.exactReturnValue = operation(operation(invocation('ln', [-n]), operation(id('i'), id('pi'), '*'), '+'), invocation('ln', [b || 10]), '/');
						throw new ReferenceError('log ' + n + ' is not a simple number');
					} else {
						return new ComplexNumber(Math.log(-n) / Math.log(b || 10), Math.PI / Math.log(b || 10));
					}
				}
				if(laskya.maintain) {
					laskya.maintain = false;
					var log = predefs.log(n, b);
					laskya.maintain = true;
					if(log % 1) throw new ReferenceError('log ' + n + ' is not a simple number');
				}
				
				if(laskya.approximate && !b) return Math.log(n) / Math.LN10;
				
				if(!b) return n.log10();
				var value = b.valueOf();
				if(+value === 10) {
					return n.log10();
				}
				if(+value === 2) {
					return n.log2();
				}
				return n.ln().divide(b.ln());
			},
			ln: function(n) {
				if(n < 0) {
					if(laskya.maintain) {
						laskya.exactReturnInput = this.input;
						laskya.exactReturnValue = operation(invocation('ln', [-n]), operation(id('i'), id('pi'), '*'), '+');
						throw new ReferenceError('ln ' + n + ' is not a simple number');
					} else {
						return new ComplexNumber(Math.log(-n), Math.PI);
					}
				}
				if(laskya.maintain) {
					laskya.maintain = false;
					var log = predefs.ln(n);
					laskya.maintain = true;
					if(log % 1) throw new ReferenceError('ln ' + n + ' is not a simple number');
				}
				if(laskya.approximate) return Math.log(n);
				return n.ln();
			},
			sort: function(list) {
				return list.sort(function(l, r) {
					if(l < r) return -1;
					if(l === r) return 0;
					if(l > r) return 1;
				});
			},
			divisors: function(x) {
				var factors = predefs.filter(predefs.factors(x)),
					factorslen = factors.length,
					divisors = [];
				x = +x;
				for(var i = 0; i < factorslen; i++) {
					divisors.push(factors[i]);
					if(+factors[i]) for(var j = factors[i] << 1; j <= x; j += factors[i]) { // factors[i] * 2
						if(x % j === 0) {
							divisors.push(j);
						}
					}
				}
				return predefs.sort(predefs.filter(divisors));
			},
			factors: function(x) {
				var factors = [],
					chk = 2;
				x = +x;
				while(chk * chk <= x){
					if(x % chk === 0) {
						factors.push(chk);
						x /= chk;
					} else {
						chk++;
					}
				}
				if(x !== 1) {
					factors.push(x);
				}
				return factors;
			},
			totient: function(x) {
				var tot = 1,
					factors = predefs.filter(predefs.factors(x)),
					factorslen = factors.length,
					i = 0;
				for(; i < factorslen; i++) {
					tot *= 1 - 1 / factors[i];
				}
				return tot * x;
			},
			/*p: setflag(function(input, pro) {
				scopes.push({});
				var ret = 1,
					cond,
					next,
					i,
					id,
					max;
				if(pro.length === 1 && pro[0].type === 'number') {
					i = 0;
					max = calculate(pro[0]);
					for(; i <= max; i++) {
						define('i', i);
						ret *= calculate(input);
					}
				} else if(pro.length === 2) {
					max = calculate(pro[1]);
					if(pro[0].value === ':') {
						id = pro[0][0].value;
						i = calculate(pro[0][1]);
						for(; i <= max; i++) {
							define(id, i);
							ret *= calculate(input);
						}
					} else if(pro[0].type === 'number') {
						i = parseFloat(pro[0].value);
						for(; i <= max; i++) {
							define('i', i);
							ret *= calculate(input);
						}
					}
				}
				scopes.pop();
				return ret;
			}, 'functionraw'),
			pn: setflag(function(input, pro) {
				if(!input) {
					return 1;
				}
				scopes.push({});
				var r = 1,
					i = 1;
				while(true) {
					define('i', i);
					define('r', r);
					if(!calculate(input)) {
						break;
					}
					if(!pro || calculate(pro[0])) {
						r *= i;
					}
					i++;
				}
				scopes.pop();
				return r;
			}, 'functionraw'),
			s: setflag(function(input, pro) {
				scopes.push({});
				var ret = 0,
					cond,
					next,
					i,
					id,
					max;
				if(pro.length === 1 && pro[0].type === 'number') {
					i = 0;
					max = calculate(pro[0]);
					for(; i <= max; i++) {
						define('i', i);
						ret += calculate(input);
					}
				} else if(pro.length === 2) {
					max = calculate(pro[1]);
					if(pro[0].value === ':') {
						id = pro[0][0].value;
						i = calculate(pro[0][1]);
						for(; i <= max; i++) {
							define(id, i);
							ret += calculate(input);
						}
					} else if(pro[0].type === 'number') {
						i = parseFloat(pro[0].value);
						for(; i <= max; i++) {
							define('i', i);
							ret += calculate(input);
						}
					}
				}
				scopes.pop();
				return ret;
			}, 'functionraw'),*/
			filter: function(arr) {
				var ret = [],
					i = 0,
					len = arr.length;
				for(; i < len; i++) {
					if(!ret.contains(arr[i])) {
						ret.push(arr[i]);
					}
				}
				return ret;
			},
			toLowerCase: function(str) {
				return str.toLowerCase();
			},
			toUpperCase: function(str) {
				return str.toUpperCase();
			},
			capitalize: function(str) {
				return str.replace(/(^|\s)[a-z]/g, function(match) {
					return match.toUpperCase();
				});
			},
			substr: function(str, a, b) {
				return str.substr(a, b);
			},
			console: setflag(function(a) {
				global.console.log.apply(global.console, arguments);
				return a;
			}, 'functionimpure'),
			eval: function(str) {
				return evaluate(str);
			},
			isSmallPrime: function(n) {
				n = +n;
				var isPrime = false,
					i = Math.ceil(Math.sqrt(n));
				while(i > 1) {
					if(n != i && (n % i === 0)) {
						return false;
					} else if(!isPrime) {
						isPrime = true;
					}
					i--;
				}
				return isPrime;
			},
			isPrime: function(n) {
				laskya.maintain = false;
				n = toBigDecimal(n);
				var compTwo = n.compareTo(TWO);
				if(compTwo === -1) return false;
				if(compTwo === 0) return true;
				var isPrime = true,
					i = TWO,
					max = n.sqroot().ceil(),
					zero = ZERO,
					one = ONE;
				while(i.compareTo(max) <= 0) {
					if(n.remainder(i).compareTo(zero) === 0) {
						return false;
					}
					i = i.add(one);
				}
				return isPrime;
			},
			isPalindrome: function(n) {
				n = (n += '').split('');
				var len = n.length,
					mid = Math.ceil(len / 2),
					a = n.slice(0, mid),
					b = n.slice(len - mid);
				return a + '' === b.reverse() + '';
			},
			permutations: memoize(function(n, includeWithZeroes) {
				var str = n + '',
					len = str.length,
					rotations = [],
					first;
				if(len === 1) return [n];
				function addRotation(rotation) {
					rotations.push(first + rotation);
				}
				for(var i = 0; i < len; i++) {
					first = str[i];
					if(!includeWithZeroes && first === '0') continue;
					_.each(predefs.permutations(str.substr(0, i) + str.substr(i + 1), true), addRotation);
				}
				return rotations;
			}),
			isPermutablePrime: function(n) {
				return predefs.isPrime(n) && _.each(predefs.permutations(n), predefs.isPrime);
			},
			rotations: function(n, skipFirst) {
				n = n.toString();
				var rotations = skipFirst ? [] : [n],
					len = n.length;
				for(var i = 1; i < len; i++) {
					rotations.push(n = n.substr(1) + n[0]);
				}
				return rotations;
			},
			isCircularPrime: function(n) {
				return predefs.isPrime(n) && _.each(predefs.rotations(n, true), predefs.isPrime);
			},
			/*R: function(n) {
				var str = '';
				for(var i = 0; i < n; i++) str += '1';
				return new BigDecimal(str);
			},*/
			base: function(n, from, to) {
				if(_.isNull(to)) {
					to = from;
					from = 10;
				}
				return parseInt(n, from || 10).toString(to || 2);
			},
			fromBase: function(n, from) {
				return predefs.base(n, from || 2, 10);
			},
			sign: function(n) {
				return toBigDecimal(n).compareTo(ZERO);
			},
			plot: setflags(function(input) {
				laskya.maintain = false;
				var fn,
					isParsed,
					isFunction,
					isPlain,
					range;
				if(input.value === ',') {
					range = calculate(input[0]);
					input = input[1];
				}
				try {
					fn = calculate(input);
					isParsed = isParsedValue(fn);
					isFunction = _.isFunction(fn);
					isPlain = _.isPlainObject(fn) || _.isArray(fn);
				} catch(e) {}
				if(isParsed) {
					laskya.plotFunction({
						trig: isTrig(fn),
						fn: fn = getFunction(fn, ['x'], 'anonymous'),
						label: currentInput.match(/\bplot([^;]+)(;|$)/)[1].replace(/x/g, 'X') + '(x) = '
					});
				} else if(isFunction) {
					laskya.plotFunction({
						fn: fn,
						label: currentInput.match(/\bplot([^;]+)(;|$)/)[1] + ' = ',
						trig: getflag(fn, 'trig') || (fn.src && isTrig(fn.src))
					});
				} else if(input.type === 'invocation' && input.args.length === 0) {
					var val = _.isString(input.value) ? input.value : input.value.value;
					fn = getVar(val);
					laskya.plotFunction({
						fn: fn,
						label: val + '(x) = ',
						trig: getflag(fn, 'trig') || (fn.src && isTrig(fn.src))
					});
				} else if(isPlain) {
					laskya.plotFunction({
						obj: fn,
						label: currentInput.match(/\bplot([^;]+)(;|$)/)[1] + '[x] = '
					});
				} else {
					laskya.plotFunction({
						fn: fn = getFunction(input, ['x'], 'anonymous'),
						label: currentInput.match(/\bplot([^;]+)(;|$)/)[1] + ' = ',
						trig: isTrig(input)
					});
				}
				return fn;
			}, 'functionraw', 'functionentire', 'functionimpure'),
			plotRange: setflag(function() {
				return laskya.plotRange.apply(laskya, arguments);
			}, 'functionimpure'),
			hyper: function(a, b, n) {
				if(n === undefined) {
					n = 4;
				}
				switch(n) {
					case 0: return b + 1;
					case 1: return a + b;
					case 2: return a * b;
					case 3: return Math.pow(a, b);
					case 4: return predefs.tetrate(a, b);
					case 5: return predefs.pentate(a, b);
					default:
						if(!b) {
							return 1;
						} else {
							return predefs.hyper(a, predefs.hyper(a, b - 1, n), n - 1);
						}
				}
			},
			tetrate: function(a, b) {
				if(!b) {
					return 1;
				} else {
					return Math.pow(a, predefs.tetrate(a, b - 1));
				}
			},
			pentate: function(a, b) {
				if(!b) {
					return 1;
				} else {
					return predefs.tetrate(a, predefs.pentate(a, b - 1));
				}
			},
			slog: function(z, b) {
				if(z <= 0)
					return predefs.slog(Math.pow(b, z), b) - 1;
				if(0 < z && z <= 1) {
					var log_b = Math.log(b);
					return -1 + 2 * log_b / (1 + log_b) * z + (1 - log_b) / (1 + log_b) * Math.pow(z, 2);
				}
				else
					return predefs.slog(predefs.log(z, b), b) + 1;
			},
			rand: Math.random,
			randInt: function(from, to) {
				return Math.floor(Math.random() * (to - from + 1)) + from;
			},
			sum: function() {
				var sum = ZERO;
				_.each(_.flatten(arguments), function(elm) {
					sum = sum.add(toBigDecimal(elm));
				});
				return sum;
			},
			product: function() {
				var prod = ONE;
				_.each(_.flatten(arguments), function(elm) {
					prod = prod.multiply(toBigDecimal(elm));
				});
				return prod;
			},
			average: function() {
				var flattened = _.flatten(arguments);
				return flattened.length ? predefs.sum(flattened).divide(toBigDecimal(flattened.length)) : NaN;
			},
			fib: memoize(function(n) {
				if(n < 0) return (n % 2 ? ONE : M_ONE).multiply(predefs.fib(-n));
				if(!+n) return ZERO;
				if(n <= 2) return ONE;
				return predefs.fib(n - 2).add(predefs.fib(n - 1));
			}),
			luc: function(n) {
				return predefs.fib(n).add(TWO.multiply(predefs.fib(n - 1)));
			},
			fact: function(n) {
				return n <= 2 ? n : n * predefs.fact(n - 1);
			},
			nCr: function(a, b) {
				return predefs.fact(a) / (predefs.fact(b) * predefs.fact(a - b));
			},
			numLen: function(n) {
				return n instanceof BigDecimal ? n.mant.length + n.exp : Math.floor(predefs.log(n)) + 1;
			},
			getVar: function(varName) {
				return getVar(varName);
			},
			'delete': setflag(function(varName) {
				return deleteRaw(varName);
			}, 'functionraw'),
			fn: setflag(function(input) {
				if(input.value === ',') {
					return getFunction(input[1], getArgs(input[0]), 'anonymous');
				} else {
					return getFunction(input, [], 'anonymous');
				}
			}, 'functionraw'),
			efn: setflags(function(input) {
				return predefs.fn(input);
			}, 'functionraw', 'functionentire'),
			echo: setflags(function() {
				laskya.echo.apply(laskya, arguments);
			}, 'functionentire', 'functionimpure'),
			print: setflag(function() {
				laskya.print.apply(laskya, arguments);
			}, 'functionimpure'),
			regExp: function(str, flags) {
				return new RegExp(str, flags);
			},
			range: function(from, to, inclusive) {
				return new Range(from, to, inclusive);
			},
			approx: setflags(function(input) {
				laskya.approximate = true;
				var result = calculate(input);
				if(result instanceof BigDecimal || result instanceof ExactNumber) {
					result = +result;
				}
				return result;
			}, 'functionraw', 'functionentire'),
			setPrecision: function(p) {
				set.digits = +p;
			},
			mathdisplay: setflags(function(input) {
				return new Raw(mathdisplay(input));
			}, 'functionraw', 'functionentire'),
			simplify: setflags(function(input) {
				laskya.maintain = true;
				laskya.expand = false;
				return simple(input);
			}, 'functionraw', 'functionentire'),
			expand: setflags(function(input) {
				laskya.expand = true;
				return simple(input);
			}, 'functionraw', 'functionentire'),
			solve: setflags(function(input, endcalc) {
				laskya.expand = false;
				return solve(simplify(trycalculate(input)), endcalc);
			}, 'functionraw', 'functionentire'),
			solveABC: function(a, b, c) {
				a = toBigDecimal(a);
				b = toBigDecimal(b);
				c = toBigDecimal(c);
				var D = b.multiply(b).subtract(a.multiply(c).multiply(FOUR));
				return trycalculate(operation(operation(operation(undefined, constObj(b), '-'), invocation('sqrt', [D]), 'plusminus'), operation(constObj(TWO), constObj(a), '*'), '/'));
			},
			differentiate: setflags(function(input, pro) {
				return differentiate(input, pro && pro[0].value);
			}, 'functionraw', 'functionentire'),
			extract: function(hash) {
				_.each(hash, define);
			},
			toFraction: function(n, period) {
				period || (period = predefs.repetitionPeriod(n));
				var frac,
					mixed,
					str = '';
				if(period) {
					frac = predefs.toRepeatingFraction(n, period);
				} else {
					frac = predefs.toSimpleFraction(n);
				}
				if(!frac) return n;
				return new ExactNumber(frac[0], frac[1]);
			},
			toSimpleFraction: function(n) {
				var isbig = n instanceof BigDecimal;
				if(isbig) n = n.divide(ONE); // divide by one to eliminate trailing zeros
				var str = n.toString(),
					nom = +str.replace('.', ''),
					ind,
					den = Math.pow(10, isbig ? -n.exp : ((ind = str.indexOf('.')) === -1 || str[str.length - 1] === '.' ? 0 : str.length - ind - 1)),
					gcd = predefs.gcd(nom, den);
				if(den < 0) {
					gcd *= -1;
				}
				nom /= gcd;
				den /= gcd;
				if((nom + '').indexOf('e') !== -1 || (nom + '').length > 10 || !isFinite(nom)) return false;
				return [nom, den];
			},
			toMixedFraction: function(n, frac) {
				frac || (frac = predefs.toSimpleFraction(n));
				return [(frac[0] >= 0 ? Math.floor : Math.ceil)(frac[0] / frac[1]), Math.abs(frac[0] % frac[1]), Math.abs(frac[1])];
			},
			toRepeatingFraction: function(n, period) {
				period || (period = predefs.repetitionPeriod(n));
				if(!period) return false;
				var str = n.toString(),
					nom = +str.substr(str.indexOf('.') + period[0] + 1, period[1]),
					den = +(predefs.repeatStr('9', period[1]) + predefs.repeatStr('0', period[0])),
					gcd = predefs.gcd(den, nom),
					bfrac = predefs.toSimpleFraction(str.substr(0, str.indexOf('.') + period[0] + 1)),
					tnom = (str[0] === '-' ? -1 : 1) * nom * bfrac[1] + bfrac[0] * den,
					tden = den * bfrac[1],
					tgcd = predefs.gcd(tnom, tden);
				return [tnom / tgcd, tden / tgcd];
			},
			// http://codegolf.stackexchange.com/questions/6215/egyptian-fractions
			toEgyptianFraction: function(n) {
				n = toExactNumber(n);
				var nom = +n.nom,
					den = +n.den;
				function r(n, a, b) {
					if(n < 2) {
						return b % a ? [] : [Math.floor(b / a)];
					}
					var l;
					for(var m = Math.floor((b + a - 1) / a), max = Math.floor(b * n / a); m <= max; m++) {
						l = r(n - 1, a * m - b, m * b);
						if(l && l.length) {
							return [m].concat(l);
						}
					}
				}
				var i = 0,
					l;
				do {
					l = r(++i, nom, den);
				} while(!l || !l.length);
				var wholes = 0,
					fractions = [];
				_.each(l, function(den) {
					if(den === 1) wholes++;
					else fractions.push('1/' + den);
				});
				return new Raw(evallatex((wholes ? wholes + '+' : '') + fractions.join('+')));
			},
			repeatStr: function(str, times) {
				return new Array(times + 1).join(str);
			},
			repetitionPeriod: function(n, recursive) {
				var str = n.toString(),
					pt = str.indexOf('.'),
					declen = str.length - pt - 2,
					dec = str.substr(pt + 1, declen),
					nperiod;
				if(pt === -1 || declen < 15) return false;
				for(var i = 2; i < 12; i++) {
					declen = str.length - pt - i - 1;
					if(declen === 0 || declen === -1 || str.substr(pt + 1, i - 1) === '0') return false;
					if(str.substr(pt + i, declen) === dec.substr(0, declen)) {
						return [0, i - 1];
					}
				}
				if(recursive !== false) for(var i = 1; i < 6; i++) {
					nperiod = predefs.repetitionPeriod(n.multiply(new BigDecimal('1' + predefs.repeatStr('0', i))), false);
					if(nperiod) {
						nperiod[0] = i;
						return nperiod;
					}
				}
				return false;
			},
			gcd: function(a, b, c) {
				if(!_.isNull(c)) {
					var args = [].slice.call(arguments);
					return predefs.gcd(args.pop(), predefs.gcd.apply(predefs, args));
				}
				var mod;
				while(b) {
					mod = a % b;
					a = b;
					b = mod;
				}
				return Math.abs(a);
			},
			lcm: function(a, b, c) {
				if(!_.isNull(c)) {
					var args = [].slice.call(arguments);
					return predefs.lcm(args.pop(), predefs.lcm.apply(predefs, args));
				}
				return a * b / predefs.gcd(a, b);
			},
			Date: function(year, month, day, hour, minute, second, millisecond) {
				return year ? (month ? new Date(year, month, day, hour || 0, minute || 0, second || 0, millisecond || 0) : new Date(year)) : new Date();
			},
			time: function(name) {
				name || (name = 'Time');
				startTimes[name] = Date.now();
			},
			timeEnd: function(name) {
				name || (name = 'Time');
				var ms = Date.now() - startTimes[name];
				laskya.echo(name, ': ', ms, 'ms');
				return ms;
			},
			setTimeout: setflag(setTimeout, 'functionimpure'),
			clearTimeout: setflag(clearTimeout, 'functionimpure'),
			alert: setflag(global.alert || function() {}, 'functionimpure'),
			'throw': function(err) {
				throw err;
			},
			'return': setflag(function(val) {
				$return.returnValue = val;
				throw $return;
			}, 'functionentire'),
			'break': setflag(function(val) {
				throw $break;
			}, 'functionentire'),
			'continue': setflag(function(val) {
				throw $continue;
			}, 'functionentire'),
			'if': setflags(function(args, contents, after) {
				if(isTruthy(calculate(args))) {
					return calculate(contents);
				} else if(after && after.value === 'else') {
					return calculate(after.contents);
				}
			}, 'functionblock', ['functionbefore', ['else']]),
			'while': setflags(function(args, contents) {
				scopes.push({});
				var result;
				while(isTruthy(calculate(args))) {
					try {
						result = calculate(contents);
					} catch(e) {
						if(e === $break) break;
						if(e !== $continue) throw e;
					}
				}
				scopes.pop();
				return result;
			}, 'functionblock'),
			'for': setflag(function(args, contents) {
				scopes.push({});
				var i,
					lim;
				if(args.value === 'in' || args.value === 'of') {
					var of = args.value === 'of',
						obj = calculate(args[1]);
					if(obj instanceof Range) {
						var lim = obj.to - obj.from;
						for(i = 0; obj.inclusive ? (i <= lim) : (i < lim); i++) {
							define(args[0].value, of ? i : obj.from + i);
							try {
								calculate(contents);
							} catch(e) {
								if(e === $break) break;
								if(e !== $continue) throw e;
							}
						}
					} else {
						_.each(obj, function(k, v) {
							define(args[0].value, of ? k : v);
							try {
								calculate(contents);
							} catch(e) {
								if(e === $break) return false;
								if(e !== $continue) throw e;
							}
						});
					}
				} else if(args.value === 'to') {
					lim = calculate(args[1]);
					for(i = 0; i < lim; i++) {
						define(args[0].value, i);
						try {
							calculate(_.clone(contents));
						} catch(e) {
							if(e === $break) break;
							if(e !== $continue) throw e;
						}
					}
				} else {
					for(calculate(args[0][0]); isTruthy(calculate(args[0][1])); calculate(args[1])) {
						try {
							calculate(contents);
						} catch(e) {
							if(e === $break) break;
							if(e !== $continue) throw e;
						}
					}
				}
				scopes.pop();
			}, 'functionblock'),
			list: function() {
				return Array.prototype.slice.call(arguments);
			},
			hash: setflag(function(input) {
				return hashFromRaw(input, {});
			}, 'functionraw'),
			typeOf: setflag(function(val) {
				try {
					return objectType(calculate(val));
				} catch(e) {
					if(e instanceof ReferenceError) return 'undefined';
					throw e;
				}
			}, 'functionraw'),
			oneOf: function() {
				return new OneOf(Array.prototype.slice.call(arguments));
			}
		}), {}],
		hashFromRaw = function(input, cache) {
			if(input.value === ';') {
				return hashFromRaw(input[1], hashFromRaw(input[0], cache));
			} else if(input.value === ':') {
				cache[calculate(input[0])] = calculate(input[1]);
				return cache;
			}
			return cache;
		},
		predefs = scopes[1],
		globals = scopes[2],
		superglobals = ['globals'],
		define = function(varName, value, deleteVar) {
			for(var i = scopes.length - 1; i >= 0; i--) {
				if(_.hasOwn(scopes[i], varName)) {
					if(deleteVar) return delete scopes[i][varName];
					scopes[i][varName] = value;
					return value;
				}
				if(getflag(scopes[i], 'scopeclosed') && !superglobals.contains(varName)) {
					break;
				}
			}
			if(deleteVar) return true;
			scopes[scopes.length - 1][varName] = value;
			return value;
		},
		defineRaw = function(left, value, deleteVar) {
			if(left.type === 'id') {
				return define(left.value, value, deleteVar);
			} else if(left.type === 'invocation' && !left.args) {
				return define(_.isString(left.value) ? left.value : left.value.value, value, deleteVar);
			} else if(left.value === '.' || left.value === '#') {
				return definePropRaw(left, [], value, deleteVar);
			}
			throw new TypeError('Invalid left-hand side in assignment');
		},
		defineProp = function(varName, props, value, deleteVar) {
			var i = scopes.length,
				ref,
				last = props.pop();
			while(i-- && !_.hasOwn(scopes[i], varName)) {
				if(getflag(scopes[i], 'scopeclosed') && !superglobals.contains(varName)) {
					throw new ReferenceError(varName + ' is not defined');
				}
			}
			if(i === -1) {
				throw new ReferenceError(varName + ' is not defined');
			}
			ref = scopes[i][varName];
			_.each(props, function(prop) {
				ref = ref[prop];
			});
			if(deleteVar) return delete ref[last];
			ref[last] = value;
			return value;
		},
		definePropRaw = function(token, props, value) {
			if(token.type === 'id') {
				defineProp(token.value, props, value);
			} else if(token.value === '#') {
				props.unshift(calculate(token[1]));
				definePropRaw(token[0], props, value);
			} else if(token.value === '.') {
				props.unshift(token[1].value);
				definePropRaw(token[0], props, value);
			}
			return value;
		},
		deleteRaw = function(token) {
			try {
				return defineRaw(token, undefined, true);
			} catch(e) {
				return false;
			}
		},
		hist = [],
		histPointer = -1,
		histSavedValue = '',
		up = function() {
			var saved = histPointer;
			histPointer--;
			if(histPointer < 0) {
				histPointer = hist.length ? hist.length - 1 : 0;
			}
			return histPointer < hist.length ? hist[histPointer].i : '';
		},
		down = function() {
			var saved = histPointer;
			histPointer++;
			if(histPointer >= hist.length) {
				histPointer = -1;
				return histSavedValue;
			}
			return histPointer < hist.length ? hist[histPointer].i : '';
		},
		updateHistPointer = function(value) {
			if(histPointer === -1) {
				histSavedValue = value;
			}
		},
		clear = function() {
			histPointer = -1;
			histSavedValue = '';
		},
		currentInput = '',
		latestRVal,
		operate = function(operator, left, right, input) {
			laskya.debuggingStack.push(input);
			var lVal,
				rVal,
				first = operator.charAt(0),
				calcLeft,
				calcRight,
				left_evald = false;
			if(operator === '-' && _.isNull(left)) {
				lVal = 0;
				calcRight = true;
			} else {
				switch(first) {
					case '*':
					case '/':
					case '\\':
					case '^':
					case '=':
					case '<':
					case '>':
						calcLeft = calcRight = true;
						break;
					case '#':
					case '.':
					case '!':
					case '?':
					case '%':
					case '&':
					case '|':
						calcLeft = true;
						break;
					case '+':
					case '-':
						var second = operator.charAt(1);
						if(second === first) {
							calcLeft = true;
						} else if(second === ':') {
							calcLeft = calcRight = true;
						} else if(second !== '>') {
							calcRight = true;
						}
						break;
					case '~':
						calcRight = true;
				}
				switch(operator) {
					case '!=':
					case '~=':
					case '..':
					case '...':
					case 'in':
					case 'of':
					case 'to':
					case 'and':
					case 'or':
					case 'mod':
						calcLeft = calcRight = true;
						break;
					case 'not':
					case 'plusminus':
						calcRight = true;
				}
			}
			if(calcLeft) {
				if(_.isNull(left)) {
					throw new SyntaxError("missing left operand for '" + operator + "'");
				}
				lVal = calculate(left);
				left_evald = true;
			}
			if(calcRight) {
				if(_.isNull(right)) {
					throw new SyntaxError("missing right operand for '" + operator + "'");
				}
				rVal = calculate(right);
			}
			if(lVal instanceof OneOf || lVal instanceof Solutions) return lVal.operate(operator, right, input);
			if(rVal instanceof OneOf || rVal instanceof Solutions) return rVal.operate(operator, left, input, true);
			var prevRVal = latestRVal;
			if(isBooleanOperation(input, true)) {
				latestRVal = rVal;
				if(isBooleanOperation(left, true)) {
					if(left.isParens) {
						lVal = !!lVal;
					} else if(lVal === true) {
						lVal = prevRVal;
					} else if(!left.isParens) {
						return false;
					}
				}
				if(isBooleanOperation(right, true) && right.isParens) {
					rVal = !!rVal;
				}
			}
			if(!left_evald && !_.isNull(left)) {
				try {
					lVal = calculate(left);
					left_evald = true;
				} catch(e) {}
			}
			var subtractOne = false;
			if(laskya.solving && lVal instanceof Percentage && rVal instanceof Percentage) {
				lVal = lVal.frac;
				rVal = rVal.frac;
			} else {
				if(lVal instanceof Percentage) {
					if(rVal instanceof Percentage) {
						lVal = lVal.frac;
						if(operator === '+' || operator === '-') {
							lVal = lVal.add(ONE);
							subtractOne = true;
						}
					} else if(operator === '+' || operator === '-') {
						var swap = lVal;
						lVal = rVal;
						rVal = swap;
						if(operator === '-') {
							lVal = lVal.multiply(M_ONE);
							operator = '+';
						}
					}
				}
				if(rVal instanceof Percentage) {
					rVal = rVal.frac;
					if(lVal) {
						if(input.inverted && (operator === '+' || operator === '-')) operator = invert(operator);
						if(operator === '+') {
							rVal = rVal.add(ONE);
							operator = input.inverted ? '/' : '*';
						} else if(operator === '-') {
							rVal = ONE.subtract(rVal);
							operator = input.inverted ? '/' : '*';
						}
					}
				}
			}
			if(_.isNumber(rVal)) {
				rVal = toBigDecimal(rVal);
			} else if(_.isString(rVal) && /^[*\/^-]$/.test(operator)) {
				rVal = new BigDecimal(rVal);
			}
			if(lVal && rVal instanceof ExactNumber && !(lVal instanceof ExactNumber || lVal instanceof ComplexNumber)) {
				lVal = new ExactNumber(lVal, 1);
			}
			if(lVal && rVal instanceof ComplexNumber && !(lVal instanceof ComplexNumber)) {
				lVal = new ComplexNumber(lVal, 0);
			}
			if(lVal instanceof Value && rVal instanceof Value) {
				var lAmount = lVal.amount,
					rAmount = rVal.amount;
				if(rVal.unit !== lVal.unit && rVal.unit.type === lVal.unit.type) {
					rAmount = rAmount * rVal.unit.conversion / lVal.unit.conversion;
				}
				if(operator === '*') {
					lVal.unit = lVal.unit.multiply(rVal.unit);
				}
				return new Value(operate(operator, constObj(lAmount), constObj(rAmount), input), lVal.unit);
			}
			if(operator !== 'in') {
				if(rVal && lVal instanceof Value) {
					return new Value(operate(operator, right, constObj(lVal.amount), input), lVal.unit);
				}
				if(lVal && rVal instanceof Value) {
					return new Value(operate(operator, left, constObj(rVal.amount), input), rVal.unit);
				}
			}
			
			switch(operator) {
				case '#':
					if(right.type === 'invocation') {
						right.value = constObj(lVal[calculate(right.value)]);
						right.thisObj = constObj(lVal);
						return calculate(right);
					}
					return lVal[calculate(right)];
				case '.':
					if(right.type === 'invocation') {
						right.value = constObj(lVal[right.value.value]);
						right.thisObj = constObj(lVal);
						return calculate(right);
					}
					return lVal[right.value];
				case "'": return differentiate(left);
				case '+':
					if(_.isNull(left)) {
						return toBigDecimal(rVal);
					} else {
						if(!left_evald) lVal = calculate(left);
						if(_.isString(rVal)) {
							return lVal + rVal;
						}
						if(_.isNull(lVal)) return rVal;
						if(laskya.approximate) return lVal + rVal;
						if(!lVal.add) lVal = toExactNumber(lVal);
						return lVal.add(rVal);
					}
				case '-':
					if(_.isNull(left)) {
						if((rVal instanceof BigDecimal && isFinite(rVal.ind)) || rVal instanceof ComplexNumber) {
							return rVal.multiply(M_ONE);
						} else {
							return -rVal;
						}
					} else {
						if(!left_evald) lVal = calculate(left);
						if(laskya.approximate) return lVal - rVal;
						if(!lVal.subtract) lVal = toExactNumber(lVal);
						return lVal.subtract(rVal);
					}
				case '*':
					//if(isParsedValue(lVal)) return getFunction(lVal, [getUnboundVarName(lVal)], 'anonymous')(rVal);
					if(lVal instanceof Unit && rVal instanceof Unit) {}
					if(lVal instanceof Unit) return new Value(rVal, lVal);
					if(rVal instanceof Unit) return new Value(lVal, rVal);
					if(subtractOne) return lVal.multiply(rVal).subtract(ONE);
					if(laskya.approximate || !lVal.multiply) return lVal * rVal;
					return lVal.multiply(rVal);
				case '/':
					if(lVal instanceof ComplexNumber) {
						return lVal.divide(rVal);
					}
					if(!(rVal.compareTo ? rVal.compareTo(ZERO) : +rVal)) {
						return NaN;
					}
					if(!isFinite(rVal)) {
						if(!isFinite(lVal) || isNaN(rVal)) return NaN;
						return 0;
					}
					if(laskya.approximate) return lVal / rVal;
					return new ExactNumber(lVal, rVal);
				case '\\': return lVal.divide(rVal).floor();
				case '^':
					if(laskya.approximate) return Math.pow(lVal, rVal);
					if(rVal < 0) {
						return BigDecimal.prototype.ONE.divide(lVal.pow(rVal.abs()));
					} else if(rVal % 1 && !(lVal instanceof ComplexNumber)) {
						if(+rVal === .5) {
							return lVal.sqroot();
						} else {
							return Math.pow(lVal, rVal);
						}
					}
					return lVal.pow(rVal);
				case '~': return rVal instanceof BigDecimal ? !+rVal : !rVal;
				case '%': return new Percentage(lVal);
				case 'not': return ~rVal;
				case 'and': return lVal & rVal;
				case 'or': return lVal | rVal;
				case 'xor': return lVal ^ rVal;
				case '..': return new Range(lVal, rVal);
				case '...': return new Range(lVal, rVal, true);
				case 'mod': return lVal.remainder(rVal);
				case '~=':
					if(_.isRegExp(rVal)) {
						return lVal.match(rVal);
					} else if(rVal instanceof Range) {
						return rVal.contains(lVal);
					} else {
						throw new TypeError('right operand is ' + _.classPropertyOf(rVal) + ', expecting RegExp or Range');
					}
				case '=': return lVal instanceof BigDecimal ? lVal.compareTo(rVal) === 0 : rVal instanceof BigDecimal ? new BigDecimal(lVal + '').compareTo(rVal) === 0 : lVal === rVal;
				case '!=': return lVal instanceof BigDecimal ? lVal.compareTo(rVal) !== 0 : rVal instanceof BigDecimal ? new BigDecimal(lVal + '').compareTo(rVal) !== 0 : lVal !== rVal;
				case '<': return lVal instanceof BigDecimal ? lVal.compareTo(rVal) === -1 : lVal < rVal;
				case '<=':
					if(lVal instanceof BigDecimal) {
						var compare = lVal.compareTo(rVal);
						return compare === -1 || compare === 0;
					}
					return lVal <= rVal;
				case '>': return lVal instanceof BigDecimal ? lVal.compareTo(rVal) === 1 : lVal > rVal;
				case '>=':
					if(lVal instanceof BigDecimal) {
						var compare = lVal.compareTo(rVal);
						return compare === 1 || compare === 0;
					}
					return lVal >= rVal;
				case 'in':
					if(rVal.contains) return rVal.contains(lVal);
					return lVal.convert(rVal);
				case 'of': return _.hasOwn(rVal, lVal);
				case 'to': return 0 <= lVal && lVal < rVal;
				case '!': return predefs.fact(lVal);
				case '&':
					if(lVal && lVal.compareTo && !lVal.compareTo(ZERO)) return lVal;
					return lVal && calculate(right);
				case '|':
					if(lVal && lVal.compareTo && !lVal.compareTo(ZERO)) return rVal;
					return lVal || calculate(right);
				case '^^': return _.isNull(lVal) ? rVal : lVal;
				case '->': return getFunction(right, getArgs(left), 'anonymous');
				case ':': return defineRaw(left, calculate(right));
				case '+:': return defineRaw(left, lVal.add(rVal));
				case '-:': return defineRaw(left, lVal.subtract(rVal));
				case '*:': return defineRaw(left, lVal.multiply(rVal));
				case '/:': return defineRaw(left, lVal.divide(rVal));
				case '^:': return defineRaw(left, lVal.pow(rVal));
				case '++': defineRaw(left, (_.isNull(lVal) ? ZERO : lVal).add(BigDecimal.prototype.ONE)); return lVal;
				case '--': defineRaw(left, lVal.subtract(BigDecimal.prototype.ONE)); return lVal;
				case ',':
					if(_.isNull(left)) {
						if(_.isNull(right)) return [];
						return [undefined, calculate(right)];
					}
					if(!left_evald) lVal = calculate(left);
					if(_.isNull(right)) {
						if(left.value === ',' && !left.isParens && left[1]) {
							return lVal;
						}
						return [lVal];
					}
					rVal = calculate(right);
					if(left.value === ',' && !left.isParens && left[1]) {
						lVal.push(rVal);
						return lVal;
					} else {
						return [lVal, rVal];
					}
				case ';':
					if(!_.isNull(left)) {
						if(!left_evald) lVal = calculate(left);
					}
					if(_.isNull(right)) {
						return lVal;
					} else {
						laskya.solving = false;
						return calculate(right);
					}
				case '?':
					var success = isTruthy(lVal);
					if(right.value === '?') {
						return success ? (right[0] ? calculate(right[0]) : lVal) : calculate(right[1]);
					} else {
						return success ? calculate(right) : null;
					}
				case 'plusminus':
					var plus = operate('+', left, right, input),
						minus = operate('-', left, right, input);
					if(plus.compareTo ? plus.compareTo(minus) === 0 : plus === minus) {
						return plus;
					} else {
						return new OneOf([plus, minus], true);
					}
			}
			if(operator.charAt(0) === '^') {
				return predefs.hyper(lVal, rVal, operator.length + 2);
			}
		},
		getArgs = function(input, isFlattened) {
			var argNames = [];
			input = _.toArray(input);
			if(!isFlattened) {
				input = _.flatten(input, function(element) {
					if(element.type === 'operation') {
						element.length = 2;
					}
					return element;
				});
			}
			_.each(input, function(el) {
				argNames.push(el.value);
			});
			return argNames;
		},
		getFunction = function(parsed, argNames, fnName) {
			var fn = function() {
				var args = arguments,
					result,
					scope = {scopeclosed: true, arguments: arguments, caller: fn.caller};
				scopes.push(scope);
				_.each(argNames, function(argName, i) {
					if(i >= args.length) {
						throw new TypeError('missing argument ' + (i + 1) + " ('" + argName + "') for function '" + fnName + "'");
					}
					define(argName, args[i]);
				});
				try {
					result = calculate(parsed);
				} catch(e) {
					if(e === $return) {
						result = e.returnValue;
					} else {
						throw e;
					}
				}
				scopes.pop();
				if(_.isFunction(result)) {
					return closure(result, scope);
				}
				return result;
			};
			fn.src = parsed;
			fn.expectedArguments = argNames;
			return fn;
		},
		getVar = function(varName) {
			if(isConst(varName)) return consts[varName];
			var i = scopes.length;
			while(i--) {
				if(_.hasOwn(scopes[i], varName)) {
					return scopes[i][varName];
				}
			}
			throw new ReferenceError(varName + ' is not defined');
		},
		getInvocationObject = function(token) {
			token.invocable = false;
			if(token.type === 'operation' && token.value === '_') {
				var pro = getPro(token[0], token[1]);
				return {
					type: 'invocation',
					value: pro.value,
					pro: pro.pro
				};
			} else {
				return {
					type: 'invocation',
					value: token
				};
			}
		},
		getPro = function(l, r) {
			if(l.pro) {
				l.pro.push(r);
				return {
					type: 'invocation',
					value: l.value,
					pro: l.pro
				};
			} else {
				return {
					type: 'invocation',
					value: l.value,
					pro: [r]
				};
			}
		},
		isValue = function(token) {
			return ['id', 'number', 'string', 'regexp', 'operation', 'invocation', 'block'].contains(token.type);
		},
		isInvocableValue = function(token) {
			return token.invocable !== false && ['id', 'string', 'operation', 'invocation'].contains(token.type);
		},
		isParsedValue = function(result) {
			return (_.isArray(result) || _.isPlainObject(result)) && 'type' in result && 'value' in result;
		},
		isTrig = function(input) {
			if(!input) return false;
			switch(input.type) {
				case 'id':
					return input.value === 'pi';
				case 'operation':
					return isTrig(input[0]) || isTrig(input[1]);
				case 'invocation':
					try {
						if(getflag((_.isString(input.value) ? getVar : calculate)(input.value), 'trig')) return true;
					} catch(e) {}
					return isTrig(input.args) || isTrig(input.pro);
			}
			return false;
		},
		isFunction = function(varName) {
			try {
				return _.isFunction(getVar(varName));
			} catch(e) {
				return false;
			}
		},
		isMathFunction = function(varName) {
			return ['abs', 'acos', 'acosh', 'arg', 'asin', 'asinh', 'atan', 'atanh', 'ceil', 'conj', 'cos', 'cosh', 'cot', 'coth', 'csc', 'csch', 'csign', 'floor', 'ln', 'log', 'round', 'sec', 'sech', 'sign', 'sin', 'sinh', 'sqrt', 'tan', 'tanh'].contains(varName);
		},
		isBooleanOperation = function(input, bothHandOnly) {
			if(_.hasOwn(input, 'isBooleanOperation')) {
				return input.isBooleanOperation;
			}
			switch(input.value) {
				case '=':
				case '!=':
				case '<':
				case '<=':
				case '>':
				case '>=':
				case '&':
				case '|':
				case '&&':
				case '^^':
					return input.isBooleanOperation = true;
				case '!':
					return input.isBooleanOperation = !bothHandOnly && !input[0];
				default:
					return input.isBooleanOperation = false;
			}
		},
		isTruthy = function(val) {
			return val instanceof BigDecimal ? val.compareTo(BigDecimal.prototype.ZERO) : val;
		},
		objectType = function(val) {
			if(val instanceof BigDecimal || val instanceof ExactNumber || val instanceof ComplexNumber) return 'number';
			if(_.isArray(val)) return 'list';
			if(_.isPlainObject(val)) return 'hash';
			if(val instanceof RegExp) return 'regExp';
			if(val instanceof Range) return 'range';
			return typeof val;
		},
		calculate = function(input) {
			laskya.debuggingStack.push(input);
			var type;
			try {
				type = input.type;
			} catch(e) {
				return;
			}
			switch(type) {
				case 'id':
					if(laskya.maintain && isNotSimple(input.value)) {
						laskya.isExactResult = true;
						throw new ReferenceError(input.value + ' is not a simple number');
					}
					var value = getVar(input.value);
					if(input.invocable !== false && _.isFunction(value)) return value();
					return value;
				case 'number':
					if(input.match[2]) {
						return parseInt(input.match[2], 2);
					}
					if(input.match[3]) {
						if(laskya.approximate) return parseFloat(input.value);
						return new BigDecimal(input.value);
					}
					return parseInt(input.value);
				case 'string':
					var replaces = {
							n: '\n',
							r: '\r',
							t: '\t',
							b: '\b',
							f: '\f'
						};
					return input.value.substr(1, input.value.length - 2).replace(/\\(.)/g, function(match, first, i, input) {
						return replaces[first] || first;
					});
				case 'regexp':
					return new RegExp(input.match[1], input.match[3]);
				case 'operation':
					return operate(input.value, input[0], input[1], input);
				case 'invocation':
					var args,
						fn = (_.isString(input.value) ? getVar : calculate)(input.value);
					if(isParsedValue(fn)) {
						fn = getFunction(fn, [getUnboundVarName(fn)], 'anonymous');
					}
					if(!_.isFunction(fn)) {
						return fn;
					}
					if(laskya.pureOnly && getflag(fn, 'functionimpure')) {
						throw Impure;
					}
					if(getflag(fn, 'functionraw')) {
						args = [input.args, input.pro];
					} else if(getflag(fn, 'functionblock')) {
						args = [input.args, input.contents, input.after];
					} else {
						var pro = [],
							prolen = (input.pro || []).length,
							i = 0;
						for(; i < prolen; i++) {
							pro.push(calculate(input.pro[i]));
						}
						args = (_.isArray(input.args) ? input.args : input.args.value === ',' ? calculate(input.args) : [calculate(input.args)]).concat(pro);
					}
					var thisObj = input.thisObj ? calculate(input.thisObj) : global;
					thisObj.input = input;
					return fn.apply(thisObj, args);
				case 'block':
					scopes.push({scopeclosed: input.scopeclosed});
					var result = calculate(input.contents);
					scopes.pop();
					return result;
				case 'const':
					return input.value;
			}
		},
		mathdisplay = function(input) {
			return latex(input);
		},
		getUnboundVarName = function(input) {
			if(!input) return;
			if(input.type === 'id') return input.value;
			return getUnboundVarName(input[0]) || getUnboundVarName(input[1]) || getUnboundVarName(input.args);
		},
		differentiate = function(input, varName) {
			if(isInvocableValue(input)) {
				try {
					var val = calculate(input);
					if(val.src) return differentiate(val.src);
					
					if(isParsedValue(val)) return differentiate(val);
				} catch(e) {}
			}
			return simple(difft(input, varName || getUnboundVarName(input)));
		},
		derivatives = {
			sin: '@cos',
			cos: '-sin x',
			tan: 'sec(x)^2',
			ln: '1/x',
			sqrt: '1/(2 sqrt x)'
		},
		difft = function(input, varName) {
			if(!input) return constObj(ZERO);
			switch(input.type) {
				case 'id':
					if(derivatives[input.value]) return subs(tokenizeparse(derivatives[input.value]), 'x', {type: 'id', value: varName});
					return constObj(input.value === varName ? ONE : ZERO);
				case 'number':
				case 'const':
					return constObj(ZERO);
				case 'operation':
					switch(input.value) {
						case '+':
						case '-':
							return operation(difft(input[0], varName), difft(input[1], varName), input.value);
						case '*':
							//if(input[1].value === varName) return input[0];
							//if(input[1].value === '^') return simplify(trycalculate(operation(operation(input[0], input[1][1], '*'), operation(input[1][0], operation(input[1][1], constObj(ONE), '-'), '^'), '*')));
							return operation(operation(input[0], difft(input[1], varName), '*'), operation(input[1], difft(input[0], varName), '*'), '+');
						case '/':
							var fdiff = difft(input[0], varName),
								gdiff = difft(input[1], varName);
							return operation(operation(operation(input[1], fdiff, '*'), operation(input[0], gdiff, '*'), '-'), operation(input[1], constObj(TWO), '^'), '/');
						case '^':
							return operation(
								input[1],
								operation(
									difft(input[0], varName),
									operation(
										input[0],
										operation(input[1], constObj(ONE), '-'),
									'^'),
								'*'),
							'*');
					}
					throw "Derivative of '" + input.value + "' not implemented yet. Sorry.";
				case 'invocation':
					var fdiff = difft(_.isString(input.value) ? {type: 'id', value: input.value} : input.value, varName);
					return operation(
						difft(input.args, varName),
						fdiff.type === 'id' ? invocation(fdiff, input.args) : subs(fdiff, varName, input.args),
						'*'
					);
			}
		},
		id = function(name) {
			return {
				type: 'id',
				value: name
			};
		},
		operation = function(first, second, operator, inverted) {
			return _.merge([first, second], {
				type: 'operation',
				value: operator,
				inverted: inverted
			});
		},
		invocation = function(value, args, pro) {
			return {
				type: 'invocation',
				value: value,
				args: args,
				pro: pro
			};
		},
		constObj = function(val) {
			return {
				type: 'const',
				value: val
			};
		},
		insertMultiply = function(insert, into) {
			var l = into[0] && (into[0].value === '+' || into[0].value === '-' ? insertMultiply(insert, into[0]) : operation(insert, into[0], '*')),
				r = into[1] && (into[1].value === '+' || into[1].value === '-' ? insertMultiply(insert, into[1]) : operation(insert, into[1], '*'));
			return simplify(operation(l, r, into.value));
		},
		equal = function(a, b) {
			if(!a || !b) return false;
			if(a.type === 'id') return a.value === b.value;
			if(a.type === 'number') return a.value + '' === b.value + '';
			if(a.type === 'const') return toBigDecimal(a.value).compareTo(toBigDecimal(b.value)) === 0;
			if(a[0]) return equal(a[0], b[0]) && equal(a[1], b[1]);
			return a === b;
		},
		simple = function(result) {
			return trycalculate(simplify(trycalculate(simplify((result))))); // .. or something.
		},
		simplify = function(result) {
			if(!result) return;
			
			if(result[0]) result[0] = simplify(result[0]);
			if(result[1]) result[1] = simplify(result[1]);
			if(result.args) result.args = simplify(result.args);
			
			if(!result[0]) {
				if(result.value === '-') {
					if(result[1].value === '*' || result[1].value === '/') {
						return simplify(operation(operation(undefined, result[1][0], '-'), result[1][1], result[1].value));
					}
				}
			}
			
			if(result[0] && result[1]) {
				var val = result.value,
					isPlus = val === '+',
					isMinus = val === '-',
					isTimes = val === '*',
					isDiv = val === '/';
				
				if(isPlus) {
					if(+result[1].value === 0) {
						return simplify(result[0]);
					}
					if(result[0].type === 'id' && result[0].value === result[1].value) {
						return operation(constObj(2), simplify(result[0]), '*');
					}
					if(result[1].value === '-' && !result[1][0]) {
						return operation(result[0], result[1][1], '-');
					}
					if(result[1].value === '-') {
						return simplify(operation(operation(result[0], result[1][0], '+'), result[1][1], '-'));
					}
				} else if(isMinus) {
					if(+result[0].value === 0) {
						return operation(undefined, simplify(result[1]), '-');
					}
					if(+result[1].value === 0) {
						return simplify(result[0]);
					}
					if(equal(result[0], result[1])) {
						return constObj(0);
					}
					if(result[0].value === '+') {
						return operation(simplify(operation(result[0][0], result[1], '-')), result[0][1], '+');
					}
					if(result[0].value === '-') {
						return operation(result[0][0], simplify(operation(result[0][1], result[1], '+')), '-');
					}
					if(result[1].value === '-') {
						return simplify(operation(operation(result[0], result[1][0] || constObj(0), '-'), result[1][1], '+'));
					}
				} else if(isTimes) {
					switch(+result[1].value) {
						case -1: return operation(undefined, simplify(result[0]), '-');
						case 0: return constObj(0);
						case 1: return simplify(result[0]);
					}
					if(result[0].type === 'id' && result[0].value === result[1].value) {
						return simplify(operation(result[0], constObj(2), '^'));
					}
					if(result[0].value === '*' && result[1].type === 'id' && result[1].value === result[0][1].value) {
						return simplify(operation(result[0][0], operation(result[1], constObj(2), '^'), '*'));
					}
					if(result[0].value === '*' && result[0][1].value > result[1].value) {
						return simplify(operation(operation(result[0][0], result[1], '*'), result[0][1], '*'));
					}
					/*if(result[0].value === '*' && result[1].value !== '*') {
						return simplify(operation(result[0][1], operation(result[0][0], result[1], '*'), '*'));
					}*/
					if(result[0].value === '/' && +result[0][0].value === 1) {
						return simplify(operation(result[1], result[0][1], '/'));
					}
					if(result[1].value === '*') {
						return simplify(operation(operation(result[0], result[1][0], '*'), result[1][1], '*'));
					}
					if(result[1].value === '/' && result[1][0].type === 'id') {
						return simplify(operation(operation(result[0], result[1][1], '/'), result[1][0], '*'));
					}
					if(result[1].value === '/') {
						return simplify(operation(operation(result[0], result[1][0], '*'), result[1][1], '/'));
					}
					if(laskya.expand && result[1].value === '+' || result[1].value === '-') {
						return simplify(insertMultiply(result[0], result[1]));
					}
					/*if(laskya.expand && result[0].value === '+' || result[0].value === '-') {
						return simplify(insertMultiply(result[1], result[0]));
					}*/
				} else if(isDiv) {
					if(equal(result[0], result[1])) {
						return constObj(ONE);
					}
					if(result[0].value === '/') {
						result[0][1] = operation(result[0][1], result[1], '*');
						return simplify(result[0]);
					}
					if(result[1].value === '/') {
						result = operation(result[0], operation(result[1][1], result[1][0], '/'), '*');
						return simplify(result);
					}
					if(result[1].value === '*' && result[0].type === 'id' && result[0].value === result[1][0].value) {
						return operation(constObj(ONE), simplify(result[1][1]), '/');
					}
					if(result[1].value === '*' && result[0].type === 'id' && result[0].value === result[1][1].value) {
						return operation(constObj(ONE), simplify(result[1][0]), '/');
					}
					if(result[0].value === '*' && result[1].value === '*') {
						return simplify(operation(operation(result[0][0], result[1][0], '/'), operation(result[0][1], result[1][1], '/'), '*'));
					}
					if(result[0].value === '*' && result[0][1].type === 'id' && getUnboundVarName(result[1]) !== result[0][1].value) {
						return simplify(operation(operation(result[0][0], result[1], '/'), result[0][1], '*'));
					}
					if(result[1].type === 'const') {
						return operation(trycalculate(operation(constObj(1), result[1], '/')), simplify(result[0]), '*');
					}
				} else if(val === '^') {
					if(result[1].type === 'const') {
						switch(+result[1].value) {
							case 0: return constObj(ONE);
							case 1: return simplify(result[0]);
						}
					}
					if(result[0].value === '^') {
						return simplify(operation(result[0][0], operation(result[0][1], result[1], '*'), '^'));
					}
					if(result[0].value === '*') {
						return simplify(operation(operation(result[0][0], result[1], '^'), operation(result[0][1], result[1], '^'), '*'));
					}
				} else if(val === '=') {
					if(equal(result[0], result[1])) return constObj(true);
				}
				if(isPlus || isMinus) {
					if(result[0][1] && result[1].type === 'id' && result[1].value === result[0][1].value && result[0].value === (isPlus ? '-' : '+')) {
						return simplify(result[0][0]);
					}
					if(result[0].value === '*' && result[1].type === 'id' && result[1].value === result[0][1].value) {
						result[0][0] = operation(result[0][0], constObj(1), val);
						return simplify(result[0]);
					}
					if(result[1].value === '*' && result[0].type === 'id' && result[0].value === result[1][1].value) {
						result[1][0] = operation(constObj(1), result[1][0], val);
						return simplify(result[1]);
					}
					if(result[0].value === '*' && result[1].value === '*' && equal(result[0][1], result[1][1])) {
						return simplify(operation(operation(result[0][0], result[1][0], val), result[0][1], '*'));
					}
					/*if(result[0].value === '*' && result[1].value === '*' && result[0][1].type === 'id' && result[0][1].value === result[1][1].value) {
						result[0][0] = operation(result[0][0], result[1][0], val);
						return simplify(result[0]);
					}*/
					if(result[0].value === '*' && result[1].value === '+' && result[0][1].type === 'id' && result[0][1].value === result[1][1].value) {
						result[0][0] = operation(result[0][0], constObj(1), val);
						result[1] = result[1][0];
						return simplify(result);
					}
					if(result[0].value === '/' && result[1].value === '/' && equal(result[0][1], result[1][1])) {
						return simplify(operation(operation(result[0][0], result[1][0], val), result[0][1], '/'));
					}
				}
				if(isPlus || isTimes) {
					var compared = compareSolve(result[0], result[1]);
					//console.log(window.a, _.merge({}, result), compared);
					if(compared === 1) {
						return simplify(operation(result[1], result[0], val));
					}
					/*if(findx(result) === 0 || +result[1].value < +result[0].value) {
						var swap = result[0];
						result[0] = result[1];
						result[1] = swap;
						return simplify(result);
					}*/
				}
				if(isTimes || isDiv) {
					if(+result[0].value === 0) {
						return constObj(ZERO);
					}
					if(+result[1].value === 1) {
						return simplify(result[0]);
					}
					if(result[0].type === 'id' && result[1].value === '^' && result[1][0].value === result[0].value) {
						return operation(constObj(ONE), operation(result[1][0], operation(result[1][1], constObj(ONE),  isTimes ? '+' : '-'), '^'), val);
					}
					if(result[0].value === '*' && result[1].value === '^' && result[0][1].type === 'id' && result[0][1].value === result[1][0].value) {
						return simplify(operation(result[0][0], operation(result[1][0], operation(result[1][1], constObj(ONE), isTimes ? '+' : '-'), '^'), '/'));
					}
					if(result[0].value === '^' && result[1].value === '^' && result[0][0].type === 'id' && result[0][0].value === result[1][0].value) {
						result[0][1] = operation(result[0][1], result[1][1], isTimes ? '+' : '-');
						return simplify(result[0]);
					}
					if((result[0].value === '*' || result[0].value === '/') && result[1].type === 'id' && result[1].value === result[0][0].value) {
						return simplify(operation(operation(result[1], result[0][0], result.value), result[0][1], result[0].value));
					}
					if((result[0].value === '*' || result[0].value === '/') && result[1].type === 'id' && result[1].value === result[0][1].value) {
						return simplify(operation(operation(result[1], result[0][1], '/'), result[0][0], '*'));
					}
					if((result[1].value === '*' || result[1].value === '/') && result[0].type === 'id' && result[0].value === result[1][0].value) {
						return simplify(operation(operation(result[0], result[1][0], result.value), result[1][1], result[1].value));
					}
					if((result[1].value === '*' || result[1].value === '/') && result[0].type === 'id' && result[0].value === result[1][1].value) {
						return simplify(operation(operation(result[0], result[1][1], result[1].value), result[1][0], '*'));
					}
					if(result[0].value === '^' && result[1].type === 'id' && result[0][0].value === result[1].value) {
						laskya.dividedBy ? laskya.dividedBy.push(result[1].value) : (laskya.dividedBy = [result[1].value]);
						return operation(result[0][0], operation(result[0][1], constObj(ONE), isTimes ? '+' : '-'), '^');
					}
				}
				if(isPlus) {
					if(result[0].value === '+') {
						return simplify(operation(result[0][0], operation(result[0][1], result[1], '+'), '+'));
					}
				}
			}
			
			return result;
		},
		trycalculate = function(result) {
			if(!result) return;
			delete laskya.exactReturnValue;
			try {
				var returnValue = calculate(result);
				return isParsedValue(returnValue) ? returnValue : {
					type: 'const',
					value: returnValue
				};
			} catch(e) {
				//console.log(e.stack, result, laskya.exactReturnInput, laskya.exactReturnValue);
				if(!(e instanceof ReferenceError)) throw e;
				laskya.additionalError = e;
				laskya.isExactResult = true;
				if(laskya.exactReturnValue) return subs(result, laskya.exactReturnInput, laskya.exactReturnValue);
				if(result[0]) result[0] = trycalculate(result[0]);
				if(result[1]) result[1] = trycalculate(result[1]);
				if(result.args && !_.isArray(result.args)) result.args = trycalculate(result.args);
				return result;
			}
		},
		invert = function(name) {
			return {
				'*': '/',
				'/': '*',
				'+': '-',
				'-': '+'
			}[name];
		},
		findx = function(result) {
			if(!result) return -1;
			if(result.type === 'id') {
				try {
					getVar(result.value);
				} catch(e) {
					return 0;
				}
			}
			if(findx(result.args) !== -1) return 0;
			if(findx(result[1]) !== -1) return 1;
			if(findx(result[0]) !== -1) return 0;
			return -1;
		},
		subs = function(expr, varName, substitution) {
			if((_.isString(varName) && expr.type === 'id' && expr.value === varName) || expr === varName) return substitution.type ? substitution : constObj(substitution);
			if(expr[0]) expr[0] = subs(expr[0], varName, substitution);
			if(expr[1]) expr[1] = subs(expr[1], varName, substitution);
			if(expr.args) expr.args = subs(expr.args, varName, substitution);
			return expr;
		},
		depth = function(input) {
			if(!input) return 0;
			return Math.max(depth(input[0]), depth(input[1])) + 1;
		},
		compareSolve = function(a, b, doSwap) {
			if((laskya.comparisons = laskya.comparisons + 1 || 1) > 500) throw new RangeError('too many comparisons, aborting');
			if(!a && !b) return 0;
			if(!a) return 1;
			if(!b) return -1;
			if(['number', 'const', 'operation'].contains(a.type) && b.type === 'id') return -1;
			if(doSwap !== false) {
				var swapped = compareSolve(b, a, false);
				if(swapped !== 0) return -1 * swapped;
			}
			if(a.type !== b.type) {
				var types = ['number', 'const', 'id', 'operation', 'invocation'];
				if(types.contains(a.type) && (!types.contains(b.type) || types.indexOf(a.type) < types.indexOf(b.type))) return -1;
			}
			var depthA = depth(a),
				depthB = depth(b);
			if(depthA !== depthB) return depthA < depthB ? -1 : 1;
			if(a.type === 'operation' && b.type === 'operation') {
				var precedence = {
					'*': 0,
					'/': 0,
					'+': 1,
					'-': 1,
					'^': 2
				};
				if(precedence[a.value] !== precedence[b.value]) return precedence[a.value] < precedence[b.value] ? -1 : 1;
			}
			if(a.type === b.type && a.value < b.value) {
				if(a.type === 'id') return 1;
				return -1;
			}
			return 0;
		},
		compare = function(a, b) {
			if(!a && !b) return 0;
			if(!a) return -1;
			if(!b) return 1;
			var type = {
				number: 0,
				id: 1,
				'const': 1,
				operation: 2,
				invocation: 3
			};
			if(a.value === '*' && b.value !== '*' && b.value < '^') return 1;
			if(b.value === '*' && a.value !== '*' && a.value < '^') return -1;
			if(type[a.type] !== type[b.type]) return type[a.type] < type[b.type] ? -1 : 1;
			if(a.value < b.value) return -1;
			if(a.value > b.value) return 1;
			if(a.type === 'operation' && b.type === 'operation') return Math.max(-1, Math.min(1, compare(a[0], b[0]) + compare(a[1], b[1])));
			return 0;
		},
		solve = function(result, endcalc) {
			//console.log(_.clone(result));
			laskya.solving = true;
			laskya.solvingResult = _.clone(result);
			//console.log(result);
			if(result.value === '&' || result.value === ';') {
				scopes.push({scopeclosed: true});
				var init,
					solution;
				try {
					init = solve(_.clone(result[0]), false);
					_.each(init, function(varName, subst) {
						result[1] = subs(result[1], varName, subst);
					});
					solution = solve(_.merge({}, result[1]));
					predefs.extract(solution);
					_.extend(solution, solve(_.merge({}, result[0])));
				} catch(e) {
					init = solve(_.clone(result[1]), false);
					_.each(init, function(varName, subst) {
						result[0] = subs(result[0], varName, subst);
					});
					solution = solve(_.merge({}, result[0]));
					predefs.extract(solution);
					_.extend(solution, solve(_.merge({}, result[1])));
				} finally {
					scopes.pop();
				}
				return solution;
			}
			if(result.value === '=') {
				var loc = findx(result);
				if(loc === 1) {
					var tries = 0;
					while(1) { //result[1] && result[1].type !== 'id') {//result[1].type !== 'id') {
						//console.log(result, _.merge({}, result));
						if(!result[1]) {
							break;
						}
						if(result[1].type === 'id') break;
						if(tries++ === 100) {
							laskya.additionalError = new RangeError('Solving took too long, aborted');
							return result;
						}
						loc = findx(result[1]);
						if(loc === -1) break;
						if(result[1].type === 'operation') {
							if(result[1].value === '^') {
								if(result[0].type === 'id') {
									result = operation(trycalculate(simplify(result[1])), result[0], '=');
									break;
								}
								var pro = calculate(result[1][1]),
									sqrt = trycalculate({
										type: 'invocation',
										value: 'sqrt',
										args: [calculate(result[0]), pro]
									});
								result[0] = pro % 2 ? sqrt : trycalculate(operation(undefined, sqrt, 'plusminus'));
								result[1] = result[1][0];
							} else {
								result[0] = trycalculate(simplify(_.merge([result[0], result[1][1]], {
									type: 'operation',
									value: invert(result[1].value),
									inverted: true
								})));
								result[1] = result[1][0] || constObj(0);
							}
						}
					}
					result = operation(trycalculate(simplify(_.merge({}, result, {
						type: 'operation',
						value: '-'
					}))), constObj(0), '=');
					loc = findx(result);
				}
				if(loc === 0) {
					/* laskya.match isn't good enough yet
					window.result = _.merge({}, result);
					var sqmatch = laskya.match(result, 'a x^2 + b x + c = 0');
					console.log(_.merge({}, result), sqmatch);
					if(sqmatch) {
						var solutions = predefs.solveABC(calculate(sqmatch.a), calculate(sqmatch.b), calculate(sqmatch.c));
						return new Solutions(sqmatch.x.value, solutions);
					}*/
					
					var tries = 0;
					while(result[0].type !== 'id') {
						if(tries++ === 100) {
							laskya.additionalError = new RangeError('Solving took too long, aborted');
							return result;
						}
						if(result[0].type === 'operation') {
							loc = findx(result[0]);
							if(loc === 0) {
								if(result[0].value === '^') {
									if(findx(result[1]) !== -1) break;
									var pro = calculate(result[0][1]),
										sqrt = invocation('sqrt', trycalculate(result[1]), [trycalculate(result[0][1])]);
									result[1] = pro % 2 ? sqrt : trycalculate(operation(undefined, sqrt, 'plusminus'));
									result[0] = result[0][0];
								} else {
									result[1] = trycalculate(simplify(_.merge([result[1], result[0][1]], {
										type: 'operation',
										value: invert(result[0].value),
										inverted: true
									})));
									result[0] = result[0][0];
								}
							} else if(loc === 1) {
								if(result[0].value === '^') {
									if(result[0][0].type === 'id' && result[0][0].value === result[0][1].value) {
										result[1] = operation({
											type: 'invocation',
											value: 'ln',
											args: result[1]
										}, {
											type: 'invocation',
											value: 'lambertW',
											args: {
												type: 'invocation',
												value: 'ln',
												args: result[1]
											}
										}, '/');
										result[0] = result[0][0];
									} else {
										result[1] = {
											type: 'invocation',
											value: 'log',
											args: [calculate(result[1]), calculate(result[0][0])]
										};
										result[0] = result[0][1];
									}
								} else if(result[0].value === '-' || result[0].value === '/') {
									//console.log(_.merge({}, result));
									//console.log(compareSolve(result[0][0], result[0][1]));
									if(compareSolve(result[0][0], result[0][1]) === 1) {
										result[1] = trycalculate(simplify(operation(result[0][1], result[1], invert(result[0].value))));
										result[0] = result[0][0];
									} else {
										result[1] = trycalculate(simplify(operation(result[0][0], result[1], result[0].value)));
										result[0] = result[0][1];
									}
									//console.log(_.merge({}, result));
									//return result;
									//return solve(result);
								} else {
									var swap = (!result[0][1] || result[0][1].type !== 'id') && (result[0].value === '+' || result[0].value === '*') && compareSolve(result[0][0], result[0][1]) === -1;
									//console.log(_.merge({}, result), compareSolve(result[0][0], result[0][1]));
									result[1] = trycalculate(simplify(operation(result[1], result[0][swap ? 1 : 0], invert(result[0].value), true)));
									result[0] = result[0][swap ? 0 : 1];
								}
							} else break;
						} else if(result[0].type === 'invocation') {
							var val = result[0].value;
							if(!_.isString(val)) val = val.value;
							if(val === 'sqrt') {
								result[1] = trycalculate(simplify(operation(result[1], result[0].pro ? result[0].pro[0] : constObj(2), '^')));
								result[0] = result[0].args;
							} else if(val === 'abs') {
								result[0] = result[0].args;
								var r = calculate(result[1]);
								result[1] = constObj(new OneOf([-r, r], true));
							} else break;
						} else break;
					}
				}
				//console.log(_.merge({}, result));
				var solutions = new Solutions();
				if(laskya.dividedBy) {
					_.each(laskya.dividedBy, function(varName) {
						scopes.push({scopeclosed: true});
						define(varName, ZERO);
						try {
							if(calculate(_.clone(laskya.solvingResult))) {
								solutions.addSolution(varName, ZERO);
							}
						} catch(e) {}
						scopes.pop();
					});
				}
				
				if(result[0].type === 'id') {
					var sqmatch = laskya.match(result, 'x = (a x^2 + c) / nb');
						// or '$0 = ($3 + $1 $0^2) / $2' ?
						// no idea why it sometimes won't work without "laskya."
					if(sqmatch) {
						var a = calculate(sqmatch.a);
						if(+a) solutions = predefs.solveABC(a, calculate(operation(undefined, sqmatch.nb, '-')), calculate(sqmatch.c));
					} else {
						sqmatch = laskya.match(result, '$0 = ($2 $0^2 + $1 $0^3 + $4) / $3');
						//console.log(result, sqmatch);
					}
					
					/* else {
						console.log('no match');
						try {
							if(result[1].value === '/' && result[1][0].value === '-' && result[1][0][1].value === '*' && result[1][0][1][1].value === '^' && result[1][0][1][1][0].type === 'id' && result[1][0][1][1][0].value === result[0].value && +calculate(result[1][0][1][1][1]) === 2) {
								solutions = predefs.solveABC(calculate(result[1][0][1][0]), calculate(result[1][1]), -calculate(result[1][0][0]));
							}
							if(result[1].value === '/' && result[1][0].value === '-' && result[1][0][1].value === '^' && result[1][0][1][0].type === 'id' && result[1][0][1][0].value === result[0].value && +calculate(result[1][0][1][1]) === 2) {
								solutions = predefs.solveABC(1, calculate(result[1][1]), -calculate(result[1][0][0]));
							}
							if(result[1].value === '/' && result[1][1].value === '-' && result[1][1][1].type === 'id' && result[1][1][1].value === result[0].value) {
								solutions = predefs.solveABC(1, -calculate(result[1][1][0]), calculate(result[1][0]));
							}
							if(result[1].value === '-' && result[1][1].value === '^' && result[1][1][0].type === 'id' && result[1][1][0].value === result[0].value && +calculate(result[1][1][1]) === 2) {
								solutions = predefs.solveABC(1, 1, -calculate(result[1][0]));
							}
							if(result[1].value === '-' && result[1][0].value === '^' && result[1][0][0].type === 'id' && result[1][0][0].value === result[0].value && +calculate(result[1][0][1]) === 2) {
								solutions = predefs.solveABC(1, -1, -calculate(result[1][1]));
							}
							if(result[1].value === '-' && result[1][1].value === '/' && result[1][1][1].type === 'id' && result[1][1][1].value === result[0].value) {
								solutions = predefs.solveABC(1, -calculate(result[1][0]), calculate(result[1][1][0]));
							}
							if(result[1].value === '+' && result[1][1].value === '/' && result[1][1][1].type === 'id' && result[1][1][1].value === result[0].value) {
								solutions = predefs.solveABC(1, -calculate(result[1][0]), -calculate(result[1][1][0]));
							}
							/*if(result[1].value === '+' && result[1][1].value === '^' && result[1][1][0].type === 'id' && result[1][1][0].value === result[0].value && +calculate(result[1][1][1]) === 2) {
								solutions = predefs.solveABC(1, -1, -calculate(result[1][1]));
							}*
							if(result[1].value === '/' && result[1][0].value === '-' && result[1][0][0].value === '^' && result[1][0][0][0].type === 'id' && result[1][0][0][0].value === result[0].value && +calculate(result[1][0][0][1]) === 2) {
								solutions = predefs.solveABC(1, -calculate(result[1][1]), -calculate(result[1][0][1]));
							}
							if(result[1].value === '/' && result[1][0].value === '+' && result[1][0][1].value === '^' && result[1][0][1][0].type === 'id' && result[1][0][1][0].value === result[0].value && +calculate(result[1][0][1][1]) === 2) {
								solutions = predefs.solveABC(1, -calculate(result[1][1]), calculate(result[1][0][0]));
							}
						} catch(e) {}
					}*/
					if(solutions === false || !solutions.empty()) {
						solutions.addSolutions(solutions);
					} else {
						solutions.addSolution(result[0].value, endcalc === false ? result[1] : trycalculate(result[1]));
					}
				}/* else if(result[0].type === 'operation' && result[0].value === '^' && +calculate(result[0][1]) === 2) {
					if(result[1].value === '-' && result[0][0] && result[1][0] && result[1][0].value === '*' && result[1][0][1].type === 'id' && result[1][0][1].value === result[0][0].value) {
						solutions = predefs.solveABC(1, -calculate(result[1][0][0]), calculate(result[1][1]));
						if(solutions === false) return false;
						if(solutions) return new Solutions(result[0][0].value, solutions);
					}
				}*/
				return solutions;
				//console.log(result);
			}
			//console.log(result);
			if(endcalc === false) return result;
			try {
				return calculate(result);
			} catch(e) {
				return simple(result);
			}
		},
		display = function(result, inner) {
			if(laskya.exactResult) {
				var exact = laskya.exactResult;
				delete laskya.exactResult;
				exact = display(exact);
				var approx = display(result);
				if(exact !== approx) {
					delete laskya.additionalError;
					return exact + '&ensp;&approx;&ensp;' + approx;
				}
			}
			laskya.multipartDisplay = false;
			if(isParsedValue(result)) {
				if(result.type === 'const') {
					return display(result.value);
				} else {
					return latex(result);
				}
			}
			if(result instanceof ComplexNumber) {
				var op = '+';
				if(result.im.compareTo(ZERO) === -1) {
					result.im = result.im.multiply(M_ONE);
					op = '-';
				}
				var real = display(result.real) + '',
					multipartReal = laskya.multipartDisplay,
					im = display(result.im) + '',
					multipartIm = laskya.multipartDisplay;
				if(im === '0') return real;
				if(im === '1') im = '';
				return (real === '0' ? (op === '+' ? '' : '-') : (multipartReal ? '(' + real + ')' : real) + '&ensp;' + op + '&ensp;') + (multipartIm ? '(' + im + ')' : im) + '<i>i</i>';
			} else if(result instanceof BigDecimal || (result instanceof ExactNumber && (result = result.toBigDecimal()))) {
				if(isNaN(result.ind) || isNaN(result.exp)) return '<span class="type">(not a number)</span>';
				var clone = BigDecimal.prototype.clone(result),
					scnt = '',
					str = clone.toString();
				if(str.indexOf('E') !== -1) {
					str = BigDecimal.prototype.clone(result).finish(set(clone)).toString();
				}
				scnt = BigDecimal.prototype.clone(result).finish(scientificset).toString();
				if(scnt.indexOf('E') === -1) {
					scnt = '';
				} else {
					scnt = '${{' + scnt.replace(/E\+?/, '}·{{10}^{') + '}}}$';
					laskya.multipartDisplay = true;
				}
				if(clone.exp < -15) {
					if(scnt) scnt += '&ensp;&approx;&ensp;';
					var period = predefs.repetitionPeriod(result),
						short,
						pt,
						pre = '';
					if(period && (pt = str.indexOf('.') + 1)) {
						pre = predefs.toFraction(clone, period);
						if(pre) {
							pre += '&ensp;=&ensp;';
							laskya.multipartDisplay = true;
						} else {
							pre = '';
						}
						short = str.substr(0, pt + period[0]) + '<span class="repeating">' + str.substr(pt + period[0], period[1]) + '</span>';
					} else {
						short = clone.finish(finishset(clone)).toString();
					}
					if(short !== str) return pre + scnt + '<span><span class="approx" title="More digits&hellip;" data-long="' + str + '">' + short + '</span></span>';
				} else {
					if(scnt) scnt += '&ensp;=&ensp;';
					if(str.indexOf('.') === -1) return scnt + str;
					var frac = predefs.toFraction(result);
					if(frac) laskya.multipartDisplay = true;
					return (frac ? frac + '&ensp;=&ensp;' : '') + scnt + str;
				}
				return scnt + str;
			} else if(result === true) {
				return 'True';
			} else if(result === false) {
				return 'False';
			} else if(_.isNumber(result)) {
				if(isNaN(result)) {
					return '<span class="type">(not a number)</span>';
				} else if(isFinite(result)) {
					//var fract = predefs.toFraction(result);
					return predefs.round(result, 12);
				}
			} else if(_.isFunction(result)) {
				return '<span class="type">(function)</span>';
			} else if(_.isString(result)) {
				var replaces = {
					'\\': /\\/g,
					n: /\n/g,
					r: /\r/g,
					t: /\t/g,
					b: /[\b]/g,
					f: /\f/g
				};
				result = result.htmlSpecialChars();
				_.each(replaces, function(char, regexp) {
					result = result.replace(regexp, '<span class="escaped">\\' + char + '</span>');
				});
				return '<span class="type">"</span>' + result + '<span class="type">"</span>';
			} else if(_.isNull(result)) {
				return '<span class="type">(null)</span>';
			} else if(_.isArray(result)) {
				var ret = '<span class="type">(list)</span> (',
					nfirst = false;
				_.each(result, function(v) {
					if(nfirst) ret += ', ';
					ret += display(v);
					nfirst = true;
				});
				return ret + ')';
			} else if(result instanceof Solutions) {
				var ret = '';
				_.each(result, function(k, v) {
					if(ret) ret += '; ';
					ret += k + ' = ' + display(v, true);
				});
				if(!ret) return 'False';
				return ret;
			} else if(_.isPlainObject(result)) {
				var ret = '<span class="type">(hash)</span> (',
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
					ret += pair[0] + ': ' + display(pair[1]);
					nfirst = true;
				});
				return ret + ')';
			} else if(result instanceof OneOf) {
				var ret = '';
				_.each(result.array, function(val, i) {
					if(i) ret += ' <span class="type">or</span> ';
					ret += display(val, true);
				});
				return ret;
			} else if(result instanceof Unit) {
				return '<span class="type">(unit)</span> ' + result;
			}
			if(result === Infinity) {
				return '&infin;';
			} else if(result === -Infinity) {
				return '-&infin;';
			}
			return result;
		},
		typeof_result = function(result) {
			if(isParsedValue(result)) {
				return 'tree';
			} else if(result instanceof ComplexNumber) {
				return 'complex';
			} else if(result instanceof BigDecimal) {
				return 'bignumber';
			} else if(result instanceof ExactNumber) {
				return 'exactnumber';
			} else if(result === true || result === false) {
				return 'bool';
			} else if(_.isNumber(result)) {
				return 'number';
			} else if(_.isFunction(result)) {
				return 'function';
			} else if(_.isString(result)) {
				return 'string';
			} else if(_.isNull(result)) {
				return 'null';
			} else if(_.isArray(result)) {
				return 'list';
			} else if(result instanceof Solutions) {
				return 'solutions';
			} else if(_.isPlainObject(result)) {
				return 'hash';
			} else if(result instanceof OneOf) {
				return 'oneof';
			}
			return 'object';
		},
		export_result = function(result, parent, rightHand, noParens) {
			if(parent || isParsedValue(result)) {
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
						ret += export_result(input[0], input) + op + export_result(input[1], input, true);
						break;
					case 'invocation':
						var invocationParens = true,
							noArgs = false,
							between = '',
							fn;
						try {
							fn = (_.isString(input.value) ? getVar : calculate)(input.value) || {};
						} catch(e) {
							fn = {};
						}
						//console.log(_.merge({}, input));
						if(input.args) {
							if(_.isArray(input.args)) {
								if((_.isString(input.value) ? input.value : input.value.value) === 'sqrt') {
									if(input.args[1]) {
										if(input.args[1].compareTo(TWO)) {
											input.pro = [constObj(export_result(input.args[1]))];
										}
										input.args = [input.args[0]];
									}
								}
								input.args = constObj(input.args.map(export_result).join('\\text", "'));
							} else if(input.args.type === 'invocation') {
								invocationParens = false;
								between = ' ';
							}
						}
						if(invocationParens) {
							if(getflag(fn, 'functionnon')) {
								invocationParens = false;
								noArgs = true;
							}
						} else {
							try {
								if(getflag(getVar(input.args.value), 'functionnon')) {
									invocationParens = true;
								}
							} catch(e) {}
						}
						var pro = '';
						if(input.pro) {
							pro += '_';
							_.each(input.pro, function(p, i) {
								if(i) pro += ', ';
								pro += export_result(p, input);
							});
						}
						ret += (_.isString(input.value) ? input.value : input.value.type === 'id' ? input.value.value : export_result(input.value, input)) + between + pro + (noArgs ? '' : (invocationParens ? '[' : '{') + export_result(input.args) + (invocationParens ? ']' : '}'));
						if(input.contents) {
							ret += export_result(input.contents);
						}
						break;
					case 'block':
						ret += '{' + export_result(input.contents) + '}';
						break;
					case 'const':
						if(_.isArray(input.value)) ret += input.value.join(', ');
						else if(_.isFunction(input.value)) ret += '(function)';
						else ret += input.value;
						break;
				}
				
				if(visibleParens) ret += ')';
				
				return ret;
			} else if(result instanceof ComplexNumber) {
				var op = '+';
				if(result.im.compareTo(ZERO) === -1) {
					result.im = result.im.multiply(M_ONE);
					op = '-';
				}
				var real = export_result(result.real),
					im = export_result(result.im);
				if(im === '0') return real;
				if(im === '1') im = '';
				return (real === '0' ? '' : real + ' ' + op + ' ') + im + 'i';
			} else if(result instanceof BigDecimal) {
				return result.toString();
			} else if(result instanceof ExactNumber) {
				if(!(result.nom % 1 || result.den % 1)) {
					return result.nom.toString() + '/' + result.den.toString();
				} else {
					return result.toString();
				}
			} else if(result === true) {
				return 'True';
			} else if(result === false) {
				return 'False';
			} else if(_.isNumber(result)) {
				if(isNaN(result)) {
					return 'NaN';
				} else if(isFinite(result)) {
					//var fract = predefs.toFraction(result);
					return predefs.round(result, 12) + '';
				}
			} else if(_.isFunction(result)) {
				return '(function' + (result.name ? ' ' + result.name : '') + ')';
			} else if(_.isString(result)) {
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
			} else if(_.isNull(result)) {
				return 'Null';
			} else if(_.isArray(result)) {
				var ret = '(',
					nfirst = false;
				_.each(result, function(v) {
					if(nfirst) ret += ', ';
					ret += export_result(v);
					nfirst = true;
				});
				return ret + ')';
			} else if(result instanceof Solutions) {
				var ret = '';
				_.each(result, function(k, v) {
					if(ret) ret += '; ';
					ret += k + ' = ' + export_result(v);
				});
				if(!ret) return 'False';
				return ret;
			} else if(_.isPlainObject(result)) {
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
					ret += '"' + pair[0] + '": ' + export_result(pair[1]);
					nfirst = true;
				});
				return ret + ')';
			} else if(result instanceof OneOf) {
				var ret = 'OneOf(';
				_.each(result.array, function(val, i) {
					if(i) ret += ', ';
					ret += export_result(val);
				});
				return ret + ')';
			}
			return result + '';
		},
		similar = function(input, query) {
			return query.type === 'id' && (input.type === 'number' || input.type === 'const');
		},
		match = function(input, query) {
			query = tokenizeparse(query);
			//console.log(input, query);
			var matches = {},
				isMatch = walkmatch(input, query, matches);
			//console.log(match, matches, match && matches);
			return isMatch && matches;
		},
		walkmatch = function(input, query, matches) {
			//console.log(query.value, input.value, query, input, new Error());
			if(query.type === 'number') return equal(input, query);
			if(query.type === 'id') {
				var val = query.value;
				//console.log(input, val, matches[val], equal(input, matches[val]));
				if(matches[val] && !equal(input, matches[val])) {
					return false;
				}
				matches[val] = input;
				return true;
			}
			if(!input) return false;
			if(query.value === input.value) {
				if(walkmatch(input[0], query[0], matches) && walkmatch(input[1], query[1], matches)) return true;
				if(input.value === '+' || input.value === '*') {
					if(similar(input[0], query[1])) {
						var newmatches = _.merge({}, matches);
						if(walkmatch(input[0], query[1], newmatches) && walkmatch(input[1], query[0], matches)) {
							_.extend(matches, newmatches, true);
							return true;
						}
					}
				}
				if(!walkmatch(input[0], query[0], matches)) return false;
				if(!walkmatch(input[1], query[1], matches)) return false;
				return true;
			}
			if(query.value === '*' && query[0].type === 'id' && input.value === '-' && !input[0]) {
				matches[query[0].value] = walkmatch(input[1], query, matches) ? (matches[query[0].value] ? operation(matches[query[0].value], constObj(M_ONE), '*') : constObj(M_ONE)) : constObj(ZERO);
				return true;
			}
			if(query.value === '*' && query[0].type === 'id') {
				var success = walkmatch(input, query[1], matches);
				if(!matches[query[0].value]) matches[query[0].value] = constObj(success ? ONE : ZERO);
				return true;
			}
			if(query.value === '+' && query[0].value === '*' && query[0][0].type === 'id' && input.value === '-' && !input[0]) {
				//console.log(query, input);
				if(!matches[query[0][0].value]) matches[query[0][0].value] = constObj(M_ONE);
				return walkmatch(input[1], query, matches);
			}
			if(query.value === '+' && input.value === '-') {
				if(similar(input[0], query[1])) {
					var newmatches = _.merge({}, matches);
					if(walkmatch(input[0], query[1], newmatches) && walkmatch(operation(undefined, input[1], '-'), query[0], newmatches)) {
						_.extend(matches, newmatches, true);
						return true;
					}
				}
				//might be wrong
				/*if(similar(input[1], query[0])) {
					var newmatches = _.merge({}, matches);
					if(walkmatch(input[1], query[0], newmatches) && walkmatch(operation(undefined, input[0], '-'), query[1], newmatches)) {
						_.extend(matches, newmatches, true);
						return true;
					}
				}*/
				if(!walkmatch(input[0], query[0], matches)) return false;
				if(!walkmatch(operation(undefined, input[1], '-'), query[1], matches)) return false;
				return true;
			}
			if(query.value === '+' && query[1].type === 'id') {
				matches[query[1].value] = constObj(ZERO);
				return walkmatch(input, query[0], matches);
			}
			if(query.value === '+') {
				if(!walkmatch(input, query[0], matches)) return false;
				if(!walkmatch({}, query[1], matches)) return false;
				return true;
			}
			if(query.value === '/' && query[1].type === 'id') {
				matches[query[1].value] = constObj(ONE);
				return walkmatch(input, query[0], matches);
			}
			return false;
		},
		evallatex = function(input) {
			return latex(tokenizeparse(input));
		},
		latex = function(input) {
			return '$' + latexnode(input).replace(/\$/g, '\\text"#dollar#"') + '$';
		},
		showParens = function(input, parent, rightHand, noParens) {
			if(noParens || _.isNull(input) || _.isNull(parent)) {
				return false;
			}
			var pp = precedenceOf(parent),
				ip = precedenceOf(input);
			return input.type !== 'invocation' && parent.value !== '/' && (pp < ip || (pp === ip && (!!rightHand === (orderOf(input) !== 'right')) || (isBooleanOperation(input) && isBooleanOperation(parent)) || (input.value === ',' && parent.value === ',' && input.isParens)));
		},
		latexnode = function(input, parent, rightHand, noParens) {
			if(!input) return '{}';
			
			var visibleParens = showParens(input, parent, rightHand, noParens),
				latex = '';
			
			if(visibleParens) latex += '\\(';
			latex += '{';
			//console.log(input);
			switch(input.type) {
				case 'id':
					if(input.value === 'pi') {
						latex += '&pi;';
						break;
					} else if((parent && parent.value === '.' && rightHand)) {
						latex += '\\';
					} else if(isConst(input.value)) {
						latex += '\\' + input.value;
						break;
					}
					latex += input.value;
					break;
				case 'number':
					latex += input.value.replace(/^\./, '0.').replace(/e(.*)/i, '&middot;10^{$1}');
					break;
				case 'string':
				case 'regexp':
					latex += '\\text"' + input.value.replace(/`/g, '&#715;').replace(/"/g, '&#698;').replace(/ /g, '&nbsp;').replace(/</g, '&lt;') + '"';
					break;
				case 'operation':
					var op = input.value;
					if(op === '*') {
						if(input[0] && input[1] && (input[0].value === '€' || input[0].value === '$' || input[1].type === 'id' || (input[1].value === '^' && input[1][0].type === 'id') || showParens(input[1], input, true))) {
						//if(input[0] && input[1] && (((input[0].type === 'number' || (input[0].type === 'const' && _.isNumber(input[0].value))) && input[1].type === 'id' || showParens(input[1], input, true) || (input[1].value === '^' && input[1][0].type === 'id')) || input[0].value === '€' || input[0].value === '$')) {
							op = '';
						} else {
							op = '&middot;';
						}
					} else if(op === '-' && !input[0]) {
						op = '&ndash;';
					} else if(op === '\\') {
						op = '\\\\';
					} else if(op === '->') {
						op = '&rarr;';
					} else if(op === ':') {
						op = '\\text":&#8239;"';
					} else if(op === '*:') {
						op = '\\text"&#8239;"{&middot;:}\\text"&#8239;"';
					} else if(op === '<=') {
						op = '&le;';
					} else if(op === '>=') {
						op = '&ge;';
					} else if(op === '!=') {
						op = '&ne;';
					} else if(op === ',') {
						op = '\\text", "';
					} else if(op === ';') {
						op = ';\\html"&lt;br&gt;"';
					} else if(op === 'not') {
						op = '\\text"not&#8239;"';
					} else if(op === 'plusminus') {
						op = '&plusmn;';
					} else if(op.match(/^[a-z]/) || op === '~=' || op === '?') {
						op = '\\text"&#8239;' + op + '&#8239;"';
					} else if(op.charAt(1) === ':' || op.length >= 2) {
						op = '\\text"&#8239;"{' + op + '}\\text"&#8239;"';
					}
					latex += latexnode(input[0], input) + op + latexnode(input[1], input, true);
					break;
				case 'invocation':
					var invocationParens = true,
						noArgs = false,
						between = '',
						fn;
					try {
						fn = (_.isString(input.value) ? getVar : calculate)(input.value) || {};
					} catch(e) {
						fn = {};
					}
					//console.log(_.merge({}, input));
					if(input.args) {
						if(_.isArray(input.args)) {
							if((_.isString(input.value) ? input.value : input.value.value) === 'sqrt') {
								if(input.args[1]) {
									if(input.args[1].compareTo(TWO)) {
										input.pro = [constObj(export_result(input.args[1]))];
									}
									input.args = [input.args[0]];
								}
							}
							input.args = constObj(input.args.map(export_result).join('\\text", "'));
						} else if(input.args.type === 'invocation') {
							invocationParens = false;
							between = '\\text"&#8239;"';
						}
					}
					if(invocationParens) {
						if(getflag(fn, 'functionnon')) {
							invocationParens = false;
							noArgs = true;
						}
					} else {
						try {
							if(getflag(getVar(input.args.value), 'functionnon')) {
								invocationParens = true;
							}
						} catch(e) {}
					}
					switch(_.isString(input.value) ? input.value : input.value.value) {
						case 'sqrt':
							if(input.pro) {
								latex += '\\text""^' + latexnode(input.pro[0], input, true, true);
							}
							latex += '&#8730;' + latexnode(input.args);
							break;
						case 'abs':
							latex += '|' + latexnode(input.args) + '|';
							break;
						case 'ceil':
							latex += '&#8968;' + latexnode(input.args) + '&#8969;';
							break;
						case 'floor':
							latex += '&#8970;' + latexnode(input.args) + '&#8971;';
							break;
						default:
							var pro = '';
							if(input.pro) {
								pro += '_{';
								_.each(input.pro, function(p, i) {
									if(i) pro += '\\text", "';
									pro += latexnode(p, input);
								});
								pro += '}';
							}
							latex += (_.isString(input.value) ? '\\' + input.value : input.value.type === 'id' ? '\\' + input.value.value : latexnode(input.value, input)) + between + pro + (noArgs ? '' : (invocationParens ? '\\[' : '{') + latexnode(input.args) + (invocationParens ? '\\]' : '}'));
							break;
					}
					if(input.contents) {
						latex += latexnode(input.contents);
					}
					break;
				case 'block':
					latex += '\\{\\html"&lt;div style=\'padding-left:10px\'&gt;"' + latexnode(input.contents) + '\\html"&lt;/div&gt;"\\html"&lt;div&gt;"\\}\\html"&lt;/div&gt;"';
					break;
				case 'const':
					if(_.isArray(input.value)) latex += input.value.join('\\text", "');
					else if(_.isFunction(input.value)) latex += '\\html"&lt;span class=\'type\'&gt;(function)&lt;/span&gt;"';
					else latex += input.value;
					break;
			}
			
			if(visibleParens) latex += '\\)';
			if(!rightHand && parent && (parent.value === '^' || parent.value === '/')) {
				latex += '\\html"&lt;span operator=\'' + parent.value + '\'&gt;&lt;/span&gt;"';
			}
			latex += '}';
			
			return latex;
		},
		tokenizeparse = function(input) {
			return parse(tokenize(input));
		},
		evaluate = function(input) {
			delete laskya.additionalError;
			delete laskya.solving;
			delete laskya.isExactResult;
			delete laskya.exactResult;
			delete laskya.approximate;
			delete laskya.comparisons;
			delete laskya.pureOnly;
			laskya.maintain = true;
			laskya.debuggingStack = [];
			
			laskya.maintain = false;
			var tree = tokenizeparse(input),
				result;
			try {
				result = calculate(tree);
			} catch(e) {
				if(e instanceof ReferenceError) {
					laskya.pureOnly = true;
					result = predefs.solve(tree);
				} else {
					throw e;
				}
			}
			if(result instanceof ExactNumber) {
				var gcd = predefs.gcd(result.nom, result.den);
				if(gcd !== 1) return new ExactNumber(result.nom / gcd, result.den / gcd);
			}
			return result;
		},
		execute = function(input) {
			currentInput = input;
			latestRVal = null;
			var result = evaluate(input);
			hist.push({
				i: input,
				o: result
			});
			return result;
		},
		executedisplay = function(input) {
			return display(execute(input));
		},
		setting = function(k, v) {
			settings[k] = v;
			_.each({
				sin: setflag(Math.sin, 'trig'),
				cos: setflag(Math.cos, 'trig'),
				tan: setflag(function(x) {
					if(x && +predefs.round(Math.abs(x % Math.PI), 12) === 1.570796326795) {
						return NaN;
					}
					return Math.tan(x);
				}, 'trig'),
				csc: setflag(function(x) {
					return 1 / Math.sin(x);
				}, 'trig'),
				sec: setflag(function(x) {
					return 1 / Math.cos(x);
				}, 'trig'),
				cot: setflag(function(x) {
					if(!x || !predefs.round(Math.abs(x % Math.PI), 12)) {
						return NaN;
					}
					return 1 / Math.tan(x);
				}, 'trig')
			}, function(name, trig) {
				var degToRad = predefs.degToRad;
				predefs[name] = settings.degrad === 'd' ? function(x) {
					return trig(degToRad(x));
				} : trig;
			});
			_.each({
				asin: setflag(Math.asin, 'rtrig'),
				acos: setflag(Math.acos, 'rtrig'),
				atan: setflag(Math.atan, 'rtrig'),
				acsc: setflag(function(x) {
					return Math.asin(1 / x);
				}, 'rtrig'),
				asec: setflag(function(x) {
					return Math.acos(1 / x);
				}, 'rtrig'),
				acot: setflag(function(x) {
					if(!x) {
						return NaN;
					}
					return Math.atan(1 / x);
				}, 'rtrig')
			}, function(name, rtrig) {
				var radToDeg = predefs.radToDeg;
				predefs[name] = settings.degrad === 'd' ? function(x) {
					return new Value(radToDeg(rtrig(x)), units.deg);
				} : rtrig;
			});
		};
	scopes[0].predefs = predefs;
	scopes[0].globals = globals;
	
	setting('degrad', 'r');
	
	var laskya = global.laskya = {
		maintain: true,
		approximate: false,
		
		tokenize: tokenize,
		parse: parse,
		calculate: calculate,
		simplify: simplify,
		trycalculate: trycalculate,
		solve: solve,
		match: match,
		display: display,
		evaluate: evaluate,
		execute: execute,
		executedisplay: executedisplay,
		
		evallatex: evallatex,
		latex: latex,
		
		typeof_result: typeof_result,
		export_result: export_result,
		
		scopes: scopes,
		predefs: predefs,
		define: define,
		
		setting: setting,
		
		hist: hist,
		up: up,
		down: down,
		updateHistPointer: updateHistPointer,
		clear: clear
	};
})(this);