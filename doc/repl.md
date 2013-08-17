Laskya Basics
=============

Numbers
-------

Laskya has support for arbitrary precision numbers:

	> 2^1024
	< 179769313486231590772930519078902473361797697894230657273430081157732675805500963132708477322407536021120113879871393357658789768814416622492847430639474124377767893424865485276302219601246094119453082952085005768838150682342462881473913110540827237163350510684586298239947245938479716304835356329624224137216

Laskya also has support for fractions:

	> 2/6
	< 1/3

And complex numbers:

	> sqrt -1
	< i

Laskya also has syntax for binary, octal and hexadecimal numbers:

	> 0b01101
	< 13
	
	> 0xff
	< 255
	
	> 0o12
	< 10
	
	> 012
	< 12


Operators
---------

`+` adds two numbers, like so:

	> 5 + 6
	< 11

	> x + x
	< 2x

`+` also adds strings:

	> "5" + "6"
	< "56"

`-` subtracts numbers

	> 5 - 1
	< 4

`-` also negates numbers

	> -a - -a
	< 0

`*` multiplies numbers

	> 6 * 8
	< 48

implied `*` also works

	> 6 8
	< 48

`*` also multiplies strings

	> "6"8
	< "66666666"

`/` divides stuff

	> 1/2 + 1/3
	< 5/6 = 0.833333333333
	
	> a^2/a
	< a

`a\b` is `floor[a/b]`

	> 25\3
	< 8

`mod` is modulo or remainder

	> 25 mod 3
	< 1


Variables
---------

	> a
	< a
	
	> a: 5
	< 5
	
	> a
	< 5
	
	> 6a
	< 30
	
	> delete a
	< True
	
	> a
	< a


Equality
--------

	> sqrt -1 = i
	< True
	
	> i^2 = -1
	< True
	
	> 1/2=1/2
	< True
	
	> 1/2=2/4
	< True


Approx
------

	> 1/2
	< 1/2
	
	> approx 1/2
	< 0.5
	
	> toFraction 0.5
	< 1/2
	
	> toFraction .5
	< 1/2
	
	> approx[5/1.3333333333333]
	< 3.75
	
	> approx 3.75
	< 3.75
	
	> approx pi
	< 3.14159265359


Mixed calculating and solving
-----------------------------

	> a: 1
	< 1
	
	> a +: 1; b; a
	< 2


Unit Conversion
---------------

	> 4 * 2.5$ in €
	< 7.717121205105647
	
	> €10 + $10
	< 17.71712120510565€
	
	> €10 + $10 in $
	< 22.9582
	
	> 1L in m^3
	< 0.001
	
	> pi rad in deg
	< 180


Logical Operators
-----------------

	> True & True & False
	< False
	
	> ~True & False
	> False
	
	> 6 & 8
	< 8
	
	> 0 & 8
	< 0
	
	> 6 | 8
	< 6
	
	> 0 | 8
	< 8

NaN and Infinity
----------------

	> 1 + True
	< NaN
	
	> NaN + 1
	< NaN
	
	> 1 + NaN
	< NaN
	
	> Infinity + 1
	< Infinity
	
	> Infinity - Infinity
	< Infinity
	
	> 1/0
	< NaN
	
	> 0/0
	< NaN
	
	> Infinity + NaN
	< NaN
	
	> floor NaN
	< NaN


Autocompletion
--------------

The Laskya REPL can do autocompletion. Press tab to get completions.

	> to
	toEgyptianFraction   toFraction           toLowerCase
	toMixedFraction      toRepeatingFraction  toSimpleFraction
	toUpperCase          tonne                totient
	
	> toF
	
	> toFraction
