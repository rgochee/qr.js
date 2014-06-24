define(function (require) {

	var GF256Value = require('./GF256Value');

	// creates a polynomial in GF256[x]
	// value, term are both optional parameters
	// if term is not set, value is a list of coefficients as in [1, x, x^2, ...]
	// if term is set, then it sets the coefficient of x^term to the value
	// value can be a GF256Value or an integer (automatically converted to a GF256Value)
	function GF256Poly(value, term, isExp) {
		this.poly = [new GF256Value(0)];
		if (typeof(value) != 'undefined')
		{
			this.set(value, term, isExp);
		}
	}
	
	// This function must be called before anything else! Give a proper modulo to set up the Galois field
	GF256Poly.init = function(modulo) {
		GF256Value.init(modulo);
	}
	
	// string representation of the polynomial with higher order terms first, e.g. "3x^2 + 2x + 1"
	GF256Poly.prototype.toString = function() {
		// no terms/uninitialized
		if (!this.poly || this.poly.length == 0)
		{
			return '';
		}
		
		// initialized but no variable term
		if (this.poly.length == 1)
		{
			// convert integer to string
			return ''+this.poly[0];
		}
		
		// set up a temporary string
		var temp = '';
		
		// start with highest order term
		var i = this.poly.length-1;
		if (this.poly[i].getInteger() != 1)
		{
			// display coefficient if non unit
			temp += this.poly[i];
		}
		if (i == 1)
		{
			// display x
			temp += 'x'
		}
		else if (i > 1)
		{
			// display power of x
			temp += 'x^'+i;
		}
		
		for (--i; i >= 0; --i)
		{
			// start displaying lower powers
			if (this.poly[i].getInteger() != 0)
			{
				temp += ' + ';
				if (this.poly[i].getInteger() != 1 || i == 0)
				{
					// display coefficient of the power
					temp += this.poly[i];
				}
				
				if (i == 1)
				{
					// display x
					temp += 'x'
				}
				else if (i > 1)
				{
					// display power of x
					temp += 'x^'+i;
				}
				// i==0 term will not get the x treatment
			}
		}
		return temp;
	}
	
	// sets value of polynomial
	// term is an optional parameter
	// if term is not set, value is a list of coefficients as in [1, x, x^2, ...], overriding any original values
	// if term is set, then it sets the coefficient of x^term to the value
	// value can be a GF256Value or an integer (automatically converted to a GF256Value)
	GF256Poly.prototype.set = function(value, term, isExp) {
		if (typeof(term) == 'undefined')
		{
			this.poly = [];
			for (var i = 0; i < value.length; ++i)
			{
				if (GF256Value.prototype.isPrototypeOf(value[i]))
				{
					this.poly[i] = value[i];
				}
				else
				{
					this.poly[i] = new GF256Value(value[i], isExp);
				}
			}
		}
		else
		{
			if (GF256Value.prototype.isPrototypeOf(value))
			{
				this.poly[term] = value;
			}
			else
			{
				this.poly[term] = new GF256Value(value, isExp);
			}
			for (var i = term-1; i >= 0; --i)
			{
				if (typeof(this.poly[i]) == 'undefined')
				{
					this.poly[i] = new GF256Value(0);
				}
			}
		}
		// when value is 0, we can have leading 0 terms in the function. clear those out
		this.clearLeadingTerms();
	}
	
	// returns the leading coefficient
	GF256Poly.prototype.getMaxTerm = function() {
		return this.poly.length-1;
	}
	
	// returns the coefficient of the term whose exponent is [term]
	GF256Poly.prototype.getCoeff = function(term) {
		if (term < this.poly.length)
		{
			return this.poly[term];
		}
		return 0;
	}
	
	// clears out leading terms that are 0, e.g. 0x^2 + 1 -> 1
	GF256Poly.prototype.clearLeadingTerms = function() {
		for (i = this.poly.length-1; i > 0; --i)
		{
			if (this.poly[i].getInteger() != 0)
			{
				this.poly.length = i+ 1
				return;
			}
		}
	}
	
	// adds value of other polynomial to this, returning new result
	GF256Poly.prototype.add = function(other) {
		var i;
		// through the length of this polynomial, add the two
		for (i = 0; i < this.poly.length; ++i)
		{
			this.poly[i].add(other.poly[i]);
		}
		// the other polynomial is bigger. just set those terms directly
		for ( ; i < other.poly.length; ++i)
		{
			this.poly[i] = other.poly[i];
		}
		
		// adding two polynomials can result in leading 0 terms in the function. clear those out
		this.clearLeadingTerms();
		
		return this;
	}
	
	// multiplies value of other polynomial to this, returning new result
	GF256Poly.prototype.multiply = function(other) {
		var temp = this.poly;
		this.poly = [];
		
		for (var i = 0; i < temp.length; ++i)
		{
			// bail out early if possible
			if (temp[i].getInteger() == 0)
			{
				continue;
			}
			
			for (var j = 0; j < other.poly.length; ++j)
			{
				// bail out early if possible
				if (other.poly[j].getInteger == 0)
				{
					continue;
				}
				
				if (!this.poly[i+j])
				{
					this.poly[i+j] = new GF256Value();
				}
				
				this.poly[i+j].add(GF256Value.multiply(temp[i], other.poly[j]));
			}
		}
		
		// if we bailed out early, we may have to clean up our polynomial
		for (var i = 0; i < this.poly.length; ++i)
		{
			if (!this.poly[i])
			{
				this.poly[i] = new GF256Value();
			}
		}
		
		return this;
	}
	
	// sets value to this%other, returning new result
	GF256Poly.prototype.modulo = function(other) {
		// while polynomial is bigger than modulus
		while (this.poly.length >= other.poly.length)
		{
			// multiply modulus by c*x^e such that modulus and current polynomial will have matching leading terms
			// c = leading coefficient, e = this leading exponent - modulus leading exponent
			var b = new GF256Poly(this.poly[this.poly.length-1], this.poly.length - other.poly.length);
			b.multiply(other);
			// add to cancel out leading terms
			this.add(b);
		}
		
		return this;
	}

	return GF256Poly;
});