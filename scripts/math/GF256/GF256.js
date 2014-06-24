define(function (require) {

	// singleton variable that stores log/exp tables for GF256
	var GF256 = {};
	(function() {
		// given alpha^exp = integer
		var _logTable = [];	// logTable[val] = exp
		var _expTable = [];	// expTable[exp] = vap
		
		// helper functions
		this.log = function(val) {
			return _logTable[val];
		};
		this.exp = function(exp) {
			return _expTable[exp];
		};
		this.add = function(a, b) {
			return a ^ b;
		};
		this.multiply = function(a, b) {
			var expa = _logTable[a];
			var expb = _logTable[b];
			var expc = (expa + expb) % 255;
			return this.exp(expc);
		};
		this.inverse = function(val) {
			var exp = this.log(val);
			var invexp = 255-exp;
			return this.exp(invexp);
		};
		
		// Now set up and call function to initialize the log/exp tables
		this.init = function(modulo) {
			var exp = 0;
			var val = 1;
			for (var exp = 0; exp < 256; ++exp)
			{
				_logTable[val] = exp;
				_expTable[exp] = val;
				
				val *= 2;
				if (val >= 256)
				{
					val ^= modulo;
				}
			}
			_logTable[1] = 0;
		};
	}).call(GF256);

	return GF256;
});