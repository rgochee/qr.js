define(function(require) {

	var GF256 = require('./GF256');

	// Class that represents a value in GF256 (initialized by a value or an exponent of the generator)
	function GF256Value(val, isExp) {
		if (!val)
		{
			val = 0;
		}
		if (isExp)
		{
			this.setExponent(val);
		}
		else
		{
			this.setInteger(val);
		}
	}
	
	// This function must be called before anything else! Give a proper modulo to set up the Galois field
	GF256Value.init = function(modulo) {
		GF256.init(modulo);
	}
	
	// returns a string representation of the value. not the generator^exp
	GF256Value.prototype.toString = function() {
		return ''+this.val;
	}
	// sets value using the exponent of the generator
	GF256Value.prototype.setExponent = function(exp) {
		if (exp < 0) {
			exp = exp % 255;
			exp += 255;
		}
		this.exp = exp % 255;
		this.val = GF256.exp(this.exp);
		return true;
	}
	// sets the value directly
	GF256Value.prototype.setInteger = function(val) {
		if (val >= 256 || val < 0)
		{
			return false; // invalid
		}
		if (val == 0)
		{
			this.val = 0;
			this.exp = -1; // -1 is used to indicate an "invalid" exponent, even though it is valid (but we use 254)
			return true;
		}
		this.val = val;
		this.exp = GF256.log(val);
		return true;
	}
	// gets value of the exponent using generator representation
	GF256Value.prototype.getExponent = function(exp) {
		return this.exp;
	}
	// gets value directly
	GF256Value.prototype.getInteger = function(val) {
		return this.val;
	}
	// adds another GF256Value to current value
	GF256Value.prototype.add = function(other) {
		if (other)
		{
			this.setInteger( this.val ^ other.val );
		}
		return this;
	}
	// multiplies another GF256Value to current value
	GF256Value.prototype.multiply = function(other) {
		if (other)
		{
			if (other.val == 0 || this.val == 0)
			{
				this.setInteger( 0 );
			}
			else
			{
				this.setExponent( this.exp + other.exp );
			}
		}
		return this;
	}
	// sets the value to the multiplicative inverse
	GF256Value.prototype.invert = function() {
		this.setExponent( 255 - this.exp );
		return this;
	}

	// static functions
	GF256Value.add = function(a, b) {
		result = Object.create(a);
		result.add(b);
		return result;
	}
	GF256Value.multiply = function(a, b) {
		result = Object.create(a);
		result.multiply(b);
		return result;
	}
	GF256Value.invert = function(a) {
		result = Object.create(a);
		result.invert();
		return result;
	}

	return GF256Value;
});
