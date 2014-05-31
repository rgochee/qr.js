define(function(require) {
	// Binary math helper functions
	var BinMath = {};
	(function() {
		// Returns the log base 2 of the value. Essentially the power of the highest bit
		this.log = function(val) {
			var log = -1;
			while (val > 0) {
				log++;
				val >>= 1;
			}
			return log;
		};
		
		// Returns a binary modulo (probably not the right way to explain it...)
		this.modulo = function(dividend, divisor) {
			if (divisor == 0)
			{
				return -1; // invalid
			}
			if (divisor == 1)
			{
				return 0;
			}
			
			var divisorLen = this.log(divisor);	
			for (var dividendLen = this.log(dividend);
				 dividendLen >= divisorLen;
				 dividendLen = this.log(dividend))
			{
				dividend ^= divisor << (dividendLen-divisorLen);	
			}
			return dividend;
		};
	}).call(BinMath);

	return BinMath;
});