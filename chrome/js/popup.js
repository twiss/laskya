if(window.location.search.indexOf('focus') === -1) {
	window.location.search = "?focus";
	throw new Error; // load everything on the next page;
					 // stop execution on this page
}

var pack = chrome.extension.getBackgroundPage().pack,
	$ = pack.$,
	_ = pack._,
	laskya = pack.laskya,
	jqMath = pack.jqMath,
	plotFunction = pack.plotFunction,
	
	$doc = $(document),
	$plotscontainer = $(plotscontainer),
	
	preview = function(input) {
		localStorage.inputValue = input;
		var rendered,
			error = false;
		try {
			rendered = pack.latex(laskya.parse(laskya.tokenize(input)));
		} catch(e) {
			laskya.previewError = e;
			rendered = input;
			error = true;
		}
		if(input) {
			latest.innerHTML = '<span class="input' + (error ? ' error' : '') + '" data-val="' + input.replace(/"/g, '&quot;') + '">' + rendered + '</span>';
		} else {
			latest.innerHTML = '';
		}
		update();
		scrollDown();
	},
	end = function(input) {
		var result = '',
			rendered,
			error = false;
		//pack.loading();
		try {
			pack.currentInput = input;
			result = laskya.evaluate(input);
			console.log(result);
			rendered = pack.display(result);
			in_text.select();
		} catch(e) {
			laskya.lastError = e;
			rendered = (e + '').replace(/</g, '&lt;');
			error = true;
		}
		//pack.done();
		if(result === '<span class="type">(null)</span>' && latest.innerHTML.indexOf('<span class="input">') < 0) {
			latest.innerHTML = '';
		} else {
			latest.innerHTML += '&#8203;&nbsp;&nbsp;<span class="seperator">&#9656;</span>&nbsp;&nbsp;<span class="result'+(error ? ' error' : '')+'" data-val="' + pack.exportResult(laskya.exactResult || result).replace(/"/g, '&quot;') + '">'+rendered+'</span>';
			if(laskya.additionalError) latest.title = laskya.additionalError;
			update();
			newLatest();
		}
		in_text.focus();
		scrollDown();
		localStorage.outHTML = out.innerHTML;
	},
	update = function() {
		jqMath.parseMath(latest);
		var html = latest.innerHTML;
		if(html.indexOf('#dollar#') !== -1) {
			latest.innerHTML = html.replace(/#dollar#/g, '<i>$</i>');
		}
	},
	newLatest = function() {
		var newOut = document.createElement('div');
		newOut.className = 'row';
		out.appendChild(newOut);
		pack.latest = latest = newOut;
	},
	scrollDown = function() {
		window.scroll(window.scrollX, $doc.height());
	},
	in_input_init = function() {
		in_text.onkeydown = function(e) {
			if(e.keyCode === 40) {
				vars_dropdown.focus();
				if(!$(':selected', vars_dropdown).val()) $(':nth-child(2)', vars_dropdown).attr('selected', true);
				e.stopPropagation();
			} else if(e.keyCode !== 38) {
				e.stopPropagation();
			}
		};
		in_text.onkeyup = function(e) {
			if(e.keyCode === 13) {
				if(e.ctrlKey) {
					var selStart = in_text.selectionStart,
						selEnd = in_text.selectionEnd;
					toggleInputType();
					in_text.value = in_text.value.substr(0, selStart) + '\n' + in_text.value.substr(selEnd);
					in_text.selectionStart = selStart + 1;
					in_text.selectionEnd = selEnd + 1;
				}
			} else if(e.keyCode !== 38 && e.keyCode !== 40) {
				var val = this.value,
					match = val.substr(0, this.selectionStart).match(/[$a-z]+$/i),
					id = match && match[0],
					idlen = id && id.length;
				preview(val);
				//laskya.updateHistPointer(val);
				if(id) {
					$('option', vars_dropdown).each(function(i, el) {
						if(el.value.substr(0, idlen) === id) {
							el.selected = true;
							return false;
						}
					});
				}
			}
		};
		in_text.onkeypress = function(e) { // for repetition
			if(e.keyCode === 13 && !e.ctrlKey) {
				preview(this.value);
				end(this.value);
				//laskya.clear();
				pack.setVarsDropdown();
			}
		};
		in_text.onpaste = function(e) {
			var html = e.clipboardData.getData('text/html'),
				plain = e.clipboardData.getData('text/plain'),
				text,
				english;
			if(html.indexOf('<span operator') !== -1) {
				text = html.replace(/<span operator="(.)"><\/span>/g, '$1').replace(/<[^>]+>/g, '');
			} else {
				text = plain;
			}
			english = text;
			/*english = text.replace(/((\d+(,\d+)?|(,\d+))(e[+-]?\d*(\,\d+)?)?)/g, function(nr) {
				if(in_text.value.indexOf(nr) !== -1) return nr;
				return nr.replace(/,/g, '.');
			});*/
			console.log(e.clipboardData.getData('text/plain'), e.clipboardData.getData('text/html'));
			if(english !== plain) {
				var val = in_text.value,
					sel = in_text.selectionStart;
				in_text.value = val.substr(0, sel) + english + val.substr(in_text.selectionEnd);
				in_text.selectionStart = in_text.selectionEnd = sel + english.length;
				e.preventDefault();
			}
		};
	},
	in_textarea_init = function() {
		in_text.onkeydown = function(e) {
			e.stopPropagation();
		};
		in_text.onkeyup = function(e) {
			if(e.keyCode !== 13 && !e.ctrlKey) {
				preview(this.value);
				//laskya.updateHistPointer(this.value);
				setStyles();
			}
		};
		in_text.onkeypress = function(e) { // for repetition
			if(e.keyCode === 10 && e.ctrlKey) {
				end(this.value);
				//laskya.clear();
			}
		};
	},
	toggleInputType = function() {
		var contents = in_text.value;
		if(in_text.nodeName.toLowerCase() === 'textarea') {
			in_text_container.innerHTML = '<input type="text" id="in_text" />';
			in_text_toggle.innerHTML = '&#9650;';
			in_text = document.getElementById('in_text');
			in_input_init();
			delete localStorage.isTextArea;
		} else {
			in_text_container.innerHTML = '<textarea id="in_text" rows="2">';
			in_text_toggle.innerHTML = '&#9660;';
			in_text = document.getElementById('in_text');
			in_textarea_init();
			localStorage.isTextArea = true;
		}
		in_text.value = contents;
		in_text.focus();
		setStyles();
		scrollDown();
	},
	setStyles = function() {
		in_text.rows = Math.max(Math.min(in_text.value.split('\n').length, 10), 2);
		container.style.paddingBottom = in_text.offsetHeight + 11 + 'px';
	},
	
	latest;

var updateLegendTimeout;
$doc.find('#plotscontainer').bind('plothover', function(event, pos, item) {
	if(!updateLegendTimeout)
		updateLegendTimeout = setTimeout(function() {
			pack.updateLegend(pos);
			updateLegendTimeout = null;
		}, 50);
});

window.onclick = pack.approxExpander;
window.onkeypress = pack.keypress;

var selectedRow = null,
	rightColumn = false;

function updateSelected() {
	$doc.find('.input.selected, .result.selected').removeClass('selected');
	if(selectedRow === null) return;
	var top = $doc.find('.row:not(:empty, :last)').eq(selectedRow).find(rightColumn ? '.result' : '.input').addClass('selected').offset().top;
	var plotsheigth = $doc.find('#plotscontainer')[0].offsetHeight;
	var min = top - 60 - plotsheigth;
	var max = top - window.innerHeight + 80;
	if(window.scrollY > min) {
		window.scroll(window.scrollX, min);
	} else if(window.scrollY < max) {
		window.scroll(window.scrollX, max);
	}
}

window.onkeydown = function(e) {
	var key = e.keyCode;
	if(key === 13) {
		var val = in_text.value,
			$selected = $doc.find('.input.selected, .result.selected'),
			text = $selected.attr('data-val'),
			start = in_text.selectionStart,
			end = in_text.selectionEnd;
		if(!$selected.length) return;
		selectedRow = null;
		rightColumn = false;
		updateSelected();
		in_text.value = val.substr(0, start) + text + ' ' + val.substr(end);
		in_text.focus();
		in_text.selectionStart = in_text.selectionEnd = start + text.length + 1;
		e.preventDefault();
		preview(in_text.value);
		return false;
	} else if(key === 38) {
		selectedRow--;
		e.preventDefault();
	} else if(key === 40) {
		selectedRow++;
		e.preventDefault();
	} else if(key === 39 || key === 37) {
		rightColumn = !rightColumn;
	} else if(!e.ctrlKey) {
		in_text.focus();
		return;
	}
	var last = $doc.find('.row:not(:empty, :last)').length;
	if(selectedRow === -1) selectedRow = last - 1;
	else if(selectedRow === last) {
		in_text.focus();
		selectedRow = null;
	}
	updateSelected();
	in_text.blur();
};

_.each(document.getElementsByClassName('setting'), function(setting) {
	setting.onclick = pack.setting;
});

pack.newLatest = newLatest;
pack.setStyles = setStyles;

pack.in_text = in_text;
pack.plots = plots;
pack.plotscontainer = plotscontainer;
pack.plotstoggle = plotstoggle;
pack.out = out;
pack.latest = latest;
pack.vars_dropdown = vars_dropdown;
pack.$popup = $doc;
pack.$main = $(main);

pack.updatePlots();

if(localStorage.isTextArea) toggleInputType();
else in_input_init();

if(localStorage.outHTML) {
	out.innerHTML = localStorage.outHTML;
}

updateSelected();
newLatest();
scrollDown();

if(localStorage.inputValue) {
	var val = localStorage.inputValue;
	in_text.value = val;
	// Might cause performance issues:
	//try {
	//	preview(val);
	//} catch(e) {}
	
	//laskya.updateHistPointer(val);
}

window.onunload = function() {
	localStorage.inputSelectionStart = in_text.selectionStart;
	localStorage.inputSelectionEnd = in_text.selectionEnd;
};
if(localStorage.inputSelectionStart && localStorage.inputSelectionEnd) {
	in_text.selectionStart = localStorage.inputSelectionStart;
	in_text.selectionEnd = localStorage.inputSelectionEnd;
}
console.log(in_text);
in_text.focus();

in_text_toggle.onclick = toggleInputType;

clear.onclick = pack.clear;

plotstoggle.onclick = pack.togglePlots;

switch_mode.onclick = pack.openSidewindow;

var degrad = localStorage.settingsdegrad;
if(degrad) {
	laskya.setting('degrad', degrad);
	_.each(document.querySelectorAll('.setting[data-key="degrad"]'), function(el) {
		el.className = el.getAttribute('data-value') === degrad ? 'selected' : '';
	});
}

$plotscontainer.bind('plotpan plotzoom', function(e, plot) {
	var x = plot.getAxes().xaxis;
	pack.plotRange = [x.min, x.max, (x.max - x.min) / 400];
	pack.updatePlots(true);
	pack.initLegends();
});

$(vars_dropdown).bind('click keydown keyup', function(e) {
	e.stopPropagation();
	if(e.type === 'keydown' || (e.type === 'click' && (!this.value || e.offsetY >= 0)) || (e.type === 'keyup' && e.keyCode !== 13)) return;
	var val = in_text.value,
		len = this.value.length,
		start = in_text.selectionStart,
		end = in_text.selectionEnd,
		match;
	if(start === end && (match = val.substr(0, start).match(/[$a-z]+$/i))) {
		in_text.value = val.substr(0, start).replace(/[$a-z]+$/i, this.value) + ' ' + val.substr(end);
		in_text.selectionStart = in_text.selectionEnd = start + len - match[0].length + 1;
	} else {
		in_text.value = val.substr(0, start) + this.value + ' ' + val.substr(end);
		in_text.selectionStart = in_text.selectionEnd = start + len + 1;
	}
	in_text.focus();
	preview(in_text.value);
	$(':first', vars_dropdown).attr('selected', true);
});

function addArrow(dir, right, top, offset) {
	$('<img class="button" src="img/arrow-' + dir + '.png" style="right:' + right + 'px;top:' + top + 'px">').appendTo(plotscontainer).click(function (e) {
		e.preventDefault();
		pack.plotObject.pan(offset);
	});
}

addArrow('left', 55, 47, { left: -100 });
addArrow('right', 35, 47, { left: 100 });

setStyles();

pack.setVarsDropdown();

//console.profileEnd('popup.js');

if(location.search.indexOf('sidewindow') !== -1) {
	pack.focusedWindow = 'sidewindow';
	$(switch_mode).remove();
	window.onfocus = function() {
		if(pack.focusedWindow === 'popup') location.reload();
	};
} else {
	pack.focusedWindow = 'popup';
}
