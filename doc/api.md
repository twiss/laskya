The Laskya API
==============

Laskya creates two globals: `_` and `laskya`. `_` contains some utility functions, while `laskya` contains the core API.

Methods of `laskya`
-------------------

`laskya.tokenize(input)`

Tokenizes an input string; returns an array of tokens.

`laskya.parse(tokens)`

Parses a tokens array and returns a source tree.

`laskya.execute(tree)`

Takes a source tree and executes it. Returns the result.

`laskya.evaluate(input)`

Shortcut for `tokenize`, `parse`, and `execute`.

`laskya.typeOf(result)`

Returns a string indicating the type of the value returned by `execute`.

Can be one of:

- 'tree'
- 'complexnumber'
- 'bignumber'
- 'exactnumber'
- 'number'
- 'bool'
- 'function'
- 'string'
- 'null'
- 'list'
- 'solutions'
- 'hash'
- 'oneof'
- 'unknown'

`laskya.addPredef(varName, value, ...flags)`

Add a variable to the same scope as predefined functions like `round`.
You can optionally add one or more flags, which can be one of the
following:

-	`'functionraw'`
	
	Instead of normal arguments, `value` is passed `(args, pro)`,
	both of which are laskya-internal source trees: `args` are
	the arguments, and `pro` is the tree fragment after the
	underscore, like in `sqrt_3 27`.

-	`'functionblock'`
	
	With this flag, `value` is passed `(args, contents, after)`.
	Useful for implementing control structures, like `switch`.

-	`'functionnon'`
	
	With this flag, the function is parsed more like a variable
	(taking no arguments), although you can still pass it
	arguments by using brackets (`[]`).