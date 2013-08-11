Laskya Basics
=============

Numbers
-------

Laskya has support for arbitrary precision numbers:

> 2^2024
< 1926243667084634739203147690812942502525097290856569053657671536655703493289225750756096924038107005577607033307665468424208137938409502571528443836358087248839788279968559509024035796546319252657655336760524962441730035462535605201830750366358528761302330842735547127895806782933537114179584526963468216986770292126516600991528330730591092675617705347259421471242773870189847123188284654268637811712275571627971148712543359837388894030588963383698683834864693119003005366606165183170149153573926170079092892562190097447338461713096678175819845507525768121215319760765625810900051503098306187879655114031497216

Laskya also has support for fractions:

> 2/6
< 1/3

And complex numbers:

> sqrt -1
< i

Laskya also has syntax for binary and hexadecimal numbers:

> 0b01101
< 13

> 0xff
< 255


Operators
---------

+ adds two numbers, like so:

> 5 + 6
< 11

> x + x
< 2x

+ also adds strings:

> "5" + "6"
< "56"

- subtracts numbers

> 5 - 1
< 4

- also negates numbers

> -a - -a
< 0


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

> approx[5/1.333333]
< 3.75

> approx 3.75
< 3.75

> approx pi
< 3.14159265359


Autocompletion
--------------

The Laskya REPL can do autocompletion. Press tab to get completions.

> to
toEgyptianFraction   toFraction           toLowerCase
toMixedFraction      toRepeatingFraction  toSimpleFraction
toUpperCase          tonne                totient

> toF

> toFraction