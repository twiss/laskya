var plotFunctions = localStorage.plotFunctions ? JSON.parse(localStorage.plotFunctions) : [],
	plotOptions = {
		//lines: { show: false },
		//points: { show: true, fillColor: false, radius: .5 },
		crosshair: {
			mode: 'x'
		},
		grid: {
			hoverable: true,
			autoHighlight: false
		},
		legend: {
			position: 'nw'
		},
		zoom: {
			interactive: true
		},
		pan: {
			interactive: true
		}
	},
	plotObject,
	updatePlots = function(force) {
		console.log(plotFunctions);
		if(plotFunctions.length) {
			pack.showPlots();
			var fnlen = plotFunctions.length,
				props,
				fn,
				i = 0,
				j,
				x,
				min = pack.plotRange[0],
				max = pack.plotRange[1],
				step = pack.plotRange[2],
				data,
				mult = 1;
			laskya.approximate = true;
			laskya.maintain = false;
			for(; i < fnlen; i++) {
				props = plotFunctions[i];
				if(!props.data || force) {
					if(props.obj) {
						data = [];
						_.forEach(props.obj, function(k, v) {
							if(isFinite(k) && k >= min && k <= max) {
								data.push([k, +v]);
							}
						});
						props.data = data;
						props.bars = {show: true};
					} else {
						try {
							fn = props.fn;
							if(!fn) continue;
							data = [];
							if(props.trig) {
								
							}
							console.profile('plot ' + props.label);
							console.log(min + '');
							if(props.trig) {
								min /= Math.PI;
								step /= 2;
								mult = Math.PI;
								for(j = 0, x = min * mult; x <= max; x = (min + ++j * step) * mult) {
									data.push([x, fn(x)]);
								}
							} else {
								max = new BigDecimal(max + '');
								step = new BigDecimal(step + '');
								for(x = new BigDecimal(min + '').multiply(new BigDecimal(mult + '')); x.compareTo(max) < 0; x = x.add(step)) {
								//for(j = 0, x = min * mult; x <= max; x = (min + ++j * step) * mult) {
									//console.log(x);
									data.push([+x, +fn(x)]);
								}
							}
							console.profileEnd('plot ' + props.label);
							props.data = data;
						} catch(e) {
							console.log(e);
						}
					}
				}
			}
			console.log(plotFunctions);
			pack.plotObject = plotObject = $.plot(pack.plots, plotFunctions, plotOptions);
			pack.initLegends();
		}
	},
	getVars = function() {
		var vars = [],
			i = 0;/*,
			casei = function(a, b) {
				a = a.toLowerCase();
				b = b.toLowerCase();
				if(a === b) return 0;
				if(a < b) return -1;
				return 1;
			};*/
		_.each(laskya.scopes, function(scope) {
			vars[i] = [];
			_.each(scope, function(varName, value) {
				vars[i].push([varName, value]);
			});
			if(vars[i].length) {
				vars[i].sort(function(a, b) {
					return a[0] < b[0] ? -1 : 1;
				});
				i++;
			} else {
				vars.length = i;
			}
		});
		vars.reverse();
		return vars;
	},
	set = function(a, b) {
		return {
			digits: (b ? Math.max(a.mant.length, b.mant.length) : a.mant.length) + 30,
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
		if(laskya.typeOf(result) === 'tree') {
			if(result.type === 'const') {
				return display(result.value);
			} else {
				return latex(result);
			}
		}
		if(result instanceof laskya.ComplexNumber) {
			var op = '+';
			if(result.im.compareTo(laskya.ZERO) === -1) {
				result.im = result.im.multiply(laskya.M_ONE);
				op = '-';
			}
			var real = display(result.real) + '',
				multipartReal = laskya.multipartDisplay,
				im = display(result.im) + '',
				multipartIm = laskya.multipartDisplay;
			if(im === '0') return real;
			if(im === '1') im = '';
			return (real === '0' ? (op === '+' ? '' : '-') : (multipartReal ? '(' + real + ')' : real) + '&ensp;' + op + '&ensp;') + (multipartIm ? '(' + im + ')' : im) + '<i>i</i>';
		} else if(result instanceof BigDecimal || (result instanceof laskya.ExactNumber && (result = result.toBigDecimal()))) {
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
				var period = laskya.predefs.repetitionPeriod(result),
					short,
					pt,
					pre = '';
				if(period && (pt = str.indexOf('.') + 1)) {
					pre = laskya.predefs.toFraction(clone, period);
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
				var frac = laskya.predefs.toFraction(result);
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
				return laskya.predefs.round(result, 12);
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
		} else if(laskya.typeOf(result) === 'solutions') {
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
	latex = function(input) {
		return '$' + latexnode(input).replace(/\$/g, '\\text"#dollar#"') + '$';
	},
	showParens = function(input, parent, rightHand, noParens) {
		if(noParens || _.isNull(input) || _.isNull(parent)) {
			return false;
		}
		var pp = laskya.precedenceOf(parent),
			ip = laskya.precedenceOf(input);
		return input.type !== 'invocation' && parent.value !== '/' && (pp < ip || (pp === ip && (!!rightHand === (laskya.orderOf(input) !== 'right')) || (input.value === ',' && parent.valu === ',' && input.isParens)));
	},
	latexnode = function(input, parent, rightHand, noParens) {
		if(!input) return '{}';
		
		var visibleParens = showParens(input, parent, rightHand, noParens),
			latex = '';
		
		if(visibleParens) latex += '\\(';
		latex += '{';
		switch(input.type) {
			case 'id':
				if(input.value === 'pi') {
					latex += '&pi;';
					break;
				} else if((parent && parent.value === '.' && rightHand)) {
					latex += '\\';
				} else if(laskya.consts[input.value] !== undefined) {
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
				if(input.args) {
					if(_.isArray(input.args)) {
						if((_.isString(input.value) ? input.value : input.value.value) === 'sqrt') {
							if(input.args[1]) {
								if(input.args[1].compareTo(laskya.TWO)) {
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
					if(laskya.getflag(fn, 'functionnon')) {
						invocationParens = false;
						noArgs = true;
					}
				} else {
					try {
						if(laskya.getflag(getVar(input.args.value), 'functionnon')) {
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
	pack = {
		$: $,
		_: _,
		laskya: laskya,
		jqMath: jqMath,
		display: display,
		latex: latex,
		exportResult: exportResult,
		approxExpander: function(e) {
			var target = e.target;
			if(target.className === 'repeating') {
				target = target.parentElement;
			}
			if(target.className === 'approx') {
				target.innerHTML = target.getAttribute('data-long');
				target.className = '';
			}
		},
		setting: function() {
			var k = this.getAttribute('data-key'),
				v = this.getAttribute('data-value');
			laskya.setting(k, v);
			_.each(this.parentElement.children, function(el) {
				el.className = '';
			});
			this.className = 'selected';
			localStorage['settings' + k] = v;
			pack.in_text.focus();
			return false;
		},
		clear: laskya.predefs.clear = function() {
			delete localStorage.plotFunctions;
			delete localStorage.outHTML;
			delete localStorage.inputValue;
			
			plotFunctions = [];
			pack.hidePlots();
			laskya.plotRange(-10, 10);
			
			pack.out.innerHTML = '';
			pack.newLatest();
			
			pack.in_text.value = '';
			pack.in_text.focus();
		},
		hidePlots: function() {
			pack.plotscontainer.style.display = 'none';
			pack.plotstoggle.innerHTML = '&#9660;';
			pack.$main.css({
				minWidth: '',
				paddingTop: ''
			});
			pack.setStyles();
		},
		showPlots: function() {
			pack.plotscontainer.style.display = 'block';
			pack.plotstoggle.innerHTML = '&#9650;';
			pack.$main.css({
				minWidth: 527,
				paddingTop: 343
			});
			pack.setStyles();
		},
		togglePlots: function() {
			pack.plotscontainer.style.display === 'block' ? pack.hidePlots() : pack.showPlots();
		},
		updatePlots: updatePlots,
		updateLegend: function(pos) {
			var axes = plotObject.getAxes();
			if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max ||
				pos.y < axes.yaxis.min || pos.y > axes.yaxis.max)
				return;
		
			var i, j, dataset = plotObject.getData();
			for (i = 0; i < dataset.length; ++i) {
				var series = dataset[i];
		
				// find the nearest points, x-wise
				for (j = 0; j < series.data.length; ++j)
					if (series.data[j][0] > pos.x)
						break;
				
				// now interpolate
				var y, p1 = series.data[j - 1], p2 = series.data[j];
				if(!p1 && !p2) return;
				if (p1 == null)
					y = p2[1];
				else if (p2 == null)
					y = p1[1];
				else
					y = p1[1] + (p2[1] - p1[1]) * (pos.x - p1[0]) / (p2[0] - p1[0]);
		
				var text = series.label,
					xregex = /\bx\b(\)?)/,
					p;
				while(match = text.match(xregex)) {
					p = pos.x < 0 && !match[1];
					text = text.replace(xregex, (p ? '(' : '') + laskya.predefs.round(pos.x, 2) + (p ? ')' : '') + match[1]);
				}
				pack.legends.eq(i).text(text.replace(/=.*/, "= " + laskya.predefs.round(y, 2)));
			}
		},
		setVarsDropdown: function() {
			var vars = getVars(),
				html = '<option></option>';
			_.each(vars, function(scope, i) {
				if(i) {
					html += '<option disabled> &mdash;&mdash;&mdash; </option>';
				}
				_.each(scope, function(it) {
					html += '<option value="' + it[0] + '">' + it[0] + (_.isFunction(it[1]) ? '(' + (it[1] && it[1].expectedArguments ? it[1].expectedArguments.join(', ') : (it[1] + '').match(/function \w*\((.*?)\)/)[1]) + ')' : '') + '</option>';
				});
			});
			pack.vars_dropdown.innerHTML = html;
		},
		initLegends: function() {
			pack.legends = pack.$popup.find('#plots .legendLabel');
			pack.$popup.find('.legend > table').css('background-color', '#fff');
		},
		keypress: function(e) {
			console.log(e);
		},
		openSidewindow: function() {
			var sideWindowWidth = 550;
			chrome.windows.getLastFocused({}, function(win) {
				chrome.windows.update(win.id, {
					width: window.screen.availWidth - sideWindowWidth,
					height: window.screen.availHeight,
					top: 0,
					left: 0
				});
			});
			sidewindow = window.open('popup.html?focus&sidewindow', 'laskya', 'resizable=yes,scrollbars=yes');
			sidewindow.moveTo(window.screen.availWidth - sideWindowWidth, 0);
			sidewindow.resizeTo(sideWindowWidth, window.screen.availHeight);
		},
		plotRange: [-10, 10, .05],
		loading: function() {
			chrome.browserAction.setBadgeText({
				text: '…'
			});
		},
		done: function() {
			chrome.browserAction.setBadgeText({
				text: ''
			});
		}
	},
	sidewindow;
function plotFunction(props) {
	plotFunctions.push(props);
	if(props.trig) {
		plotOptions.xaxis = {
			ticks: function(axis) {
				var res = [];
				var i = Math.floor(axis.min / Math.PI);
				var step = (axis.max - axis.min) / 20;
				var digits = Math.max(0, Math.round(2 - Math.log(axis.max - axis.min) / Math.LN10));
				do {
					var v = i * Math.PI;
					var pi = i.toFixed(digits);
					if(pi === '-0.0') pi = '0.0';
					res.push([v, pi + '\u03c0']);
					i += step;
				} while (v < axis.max);
				return res;
			}
		};
	} else {
		plotOptions.xaxis = {};
	}
	updatePlots();
	localStorage.plotFunctions = JSON.stringify(plotFunctions);
};
laskya.plotRange = function(min, max, step) {
	console.log(min, max, step);
	if(!_.isNull(min)) pack.plotRange[0] = +min;
	if(!_.isNull(max)) pack.plotRange[1] = +max;
	else if(pack.plotRange[1] <= pack.plotRange[0]) pack.plotRange[1] = pack.plotRange[0] + 10;
	if(_.isNull(step)) pack.plotRange[2] = Math.round(pack.plotRange[1] - pack.plotRange[0]) / 400;
	else pack.plotRange[2] = step;
	updatePlots(true);
	console.log(pack.plotRange);
};
laskya.echo = function() {
	pack.newLatest();
	var echoStr = '<span class="echo">';
	_.each(arguments, function(str) {
		echoStr += _.isString(str) ? str.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;') : str;
	});
	pack.latest.innerHTML = echoStr + '</span>';
	pack.newLatest();
};
laskya.print = function() {
	pack.newLatest();
	var echoStr = '<span class="echo">';
	_.each(arguments, function(str) {
		echoStr += _.isString(str) ? str.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;') : str;
		echoStr += ' ';
	});
	pack.latest.innerHTML = echoStr + '</span>';
	pack.newLatest();
};

chrome.commands.onCommand.addListener(function(command) {
	if(command === 'toggle-sidewindow') {
		if(sidewindow && !sidewindow.closed) sidewindow.focus();
		else pack.openSidewindow();
	}
});

function exportResult(result, parent, rightHand, noParens) {
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
				ret += exportResult(input[0], input) + op + exportResult(input[1], input, true);
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
									input.pro = [{type: 'const', value: exportResult(input.args[1])}];
								}
								input.args = [input.args[0]];
							}
						}
						input.args = {type: 'const', value: input.args.map(exportResult).join('\\text", "')};
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
						pro += exportResult(p, input);
					});
				}
				ret += (_.isString(input.value) ? input.value : input.value.type === 'id' ? input.value.value : exportResult(input.value, input)) + between + pro + (noArgs ? '' : (invocationParens ? '[' : '') + exportResult(input.args) + (invocationParens ? ']' : ''));
				if(input.contents) {
					ret += exportResult(input.contents);
				}
				break;
			case 'block':
				ret += '{' + exportResult(input.contents) + '}';
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
			var real = exportResult(result.real),
				im = exportResult(result.im);
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
				ret += exportResult(v);
				nfirst = true;
			});
			return ret + ')';
		case 'solutions':
			var ret = '';
			_.each(result, function(varName, value) {
				ret += varName + ': ';
				if(laskya.typeOf(value) === 'oneof') {
					ret += value.toArray().map(exportResult).join(' | ');
				} else {
					ret += exportResult(value);
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
				ret += '"' + pair[0] + '": ' + exportResult(pair[1]);
				nfirst = true;
			});
			return ret + ')';
		case 'oneof':
			var ret = 'OneOf(';
			_.each(result.array, function(val, i) {
				if(i) ret += ', ';
				ret += exportResult(val);
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

laskya.addPredef('plot', function(input) {
	laskya.maintain = false;
	var fn,
		isParsed,
		isFunction,
		isPlain,
		range;
	if(input.value === ',') {
		range = laskya.calculate(input[0]);
		input = input[1];
	}
	try {
		fn = laskya.calculate(input);
		isParsed = laskya.typeOf(fn) === 'tree';
		isFunction = _.isFunction(fn);
		isPlain = _.isPlainObject(fn) || _.isArray(fn);
	} catch(e) {
		console.log(e.stack);
	}
	if(isParsed) {
		plotFunction({
			trig: isTrig(fn),
			fn: fn = laskya.getFunction(fn, ['x'], 'anonymous'),
			label: pack.currentInput.match(/\bplot([^;]+)(;|$)/)[1].replace(/x/g, 'X') + '(x) = '
		});
	} else if(isFunction) {
		plotFunction({
			fn: fn,
			label: pack.currentInput.match(/\bplot([^;]+)(;|$)/)[1] + ' = ',
			trig: getflag(fn, 'trig') || (fn.src && isTrig(fn.src))
		});
	} else if(input.type === 'invocation' && input.args.length === 0) {
		var val = _.isString(input.value) ? input.value : input.value.value;
		fn = getVar(val);
		plotFunction({
			fn: fn,
			label: val + '(x) = ',
			trig: getflag(fn, 'trig') || (fn.src && isTrig(fn.src))
		});
	} else if(isPlain) {
		plotFunction({
			obj: fn,
			label: pack.currentInput.match(/\bplot([^;]+)(;|$)/)[1] + '[x] = '
		});
	} else {
		plotFunction({
			fn: fn = laskya.getFunction(input, ['x'], 'anonymous'),
			label: pack.currentInput.match(/\bplot([^;]+)(;|$)/)[1] + ' = ',
			trig: isTrig(input)
		});
	}
	return fn;
}, 'functionraw', 'functionentire', 'functionimpure');

function isTrig(input) {
	if(!input) return false;
	switch(input.type) {
		case 'id':
			return input.value === 'pi';
		case 'operation':
			return isTrig(input[0]) || isTrig(input[1]);
		case 'invocation':
			try {
				if(laskya.getflag((_.isString(input.value) ? getVar : calculate)(input.value), 'trig')) return true;
			} catch(e) {}
			return isTrig(input.args) || isTrig(input.pro);
	}
	return false;
}
