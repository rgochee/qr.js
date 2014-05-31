define(function (require) {
	var GF256Value = require('../math/GF256/GF256Value');
	var GF256Poly = require('../math/GF256/GF256Poly');
	var QR = require('./qr');

	var QRUnitTests = 
	{
		currentFunction: '',

		assert: function(varName, actualValue, expectedValue) {
			if (typeof(actualValue) != typeof(expectedValue))
			{
				alert(this.currentFunction+': Value of '+varName+' has type '+typeof(actualValue)+'('+actualValue+'), expected '+typeof(expectedValue)+' ('+expectedValue+')');
			}
			if (typeof(actualValue == 'object') &&
				Object.prototype.toString.call(actualValue) != Object.prototype.toString.call(expectedValue))
			{
				alert(this.currentFunction+': Value of '+varName+' has type '+Object.prototype.toString.call(actualValue)+'('+actualValue+'), expected '+Object.prototype.toString.call(expectedValue)+' ('+expectedValue+')');
			}
			
			if (Object.prototype.toString.call(actualValue) == '[object Array]')
			{
				if (!actualValue.compare(expectedValue))
				{
					alert(this.currentFunction+': Value of '+varName+' is '+actualValue+', expected '+expectedValue);
				}
			}
			else if (actualValue != expectedValue)
			{
				alert(this.currentFunction+': Value of '+varName+' is '+actualValue+', expected '+expectedValue);
			}
		},
		
		GF256Values: function() {
			this.currentFunction = 'GF256Values';
			
			var a = new GF256Value(142);
			this.assert('a', a.getInteger(), 142);
			this.assert('exponent of a', a.getExponent(), 254);
			
			var b = new GF256Value(2);
			this.assert('b', b.getInteger(), 2);
			this.assert('exponent of b', b.getExponent(), 1);
			
			a.multiply(b);
			this.assert('a*b', a.getInteger(), 1);
			this.assert('exponent of a*b', a.getExponent(), 0);
			
			var c = new GF256Value(2, 1);
			this.assert('c', c.getInteger(), 4);
			this.assert('exponent of c', c.getExponent(), 2);
			
			var d = new GF256Value(0);
			this.assert('d', d.getInteger(), 0);
			this.assert('exponent of d', d.getExponent(), -1);
			
			var e = new GF256Value(0);
			e.setExponent(256);
			this.assert('e', e.getInteger(), 2);
			this.assert('exponent of e', e.getExponent(), 1);
			
			var f = new GF256Value(0);
			f.setExponent(-2);
			this.assert('f', f.getInteger(), 71);
			this.assert('exponent of f', f.getExponent(), 253);
		},
		
		GF256Poly: function() {
			this.currentFunction = 'GF256Poly';
			
			var p = new GF256Poly();
			p.set([new GF256Value(0, 1), 1]);
			this.assert('p', p.toString(), 'x + 1');
			
			var p1 = new GF256Poly();
			p1.set([new GF256Value(1, 1), 1]);
			this.assert('p1', p1.toString(), 'x + 2');
			p.multiply(p1);
			this.assert('p', p.toString(), 'x^2 + 3x + 2');
			
			var p2 = new GF256Poly();
			p2.set([new GF256Value(2, 1), 1]);
			this.assert('g', p2.toString(), 'x + 4');
			p.multiply(p2);
			this.assert('p', p.toString(), 'x^3 + 7x^2 + 14x + 8');
			
			var p3 = new GF256Poly();
			p3.set([new GF256Value(3, 1), 1]);
			this.assert('p3', p3.toString(), 'x + 8');
			p.multiply(p3);
			
			var p4 = new GF256Poly();
			p4.set([new GF256Value(4, 1), 1]);
			this.assert('p4', p4.toString(), 'x + 16');
			p.multiply(p4);
			
			var p5 = new GF256Poly();
			p5.set([new GF256Value(5, 1), 1]);
			this.assert('p5', p5.toString(), 'x + 32');
			p.multiply(p5);
			
			var p6 = new GF256Poly();
			p6.set([new GF256Value(6, 1), 1]);
			this.assert('p6', p6.toString(), 'x + 64');
			p.multiply(p6);
			this.assert('p', p.toString(), 'x^7 + 127x^6 + 122x^5 + 154x^4 + 164x^3 + 11x^2 + 68x + 117');
			
			var a = new GF256Poly(2, 2);
			this.assert('a', a.toString(), '2x^2');
			a.multiply(p2);
			a.add(new GF256Poly(3, 1));
			this.assert('a+p2', a.toString(), '2x^3 + 8x^2 + 3x');
			this.assert('coeff of x^2 of a', a.getCoeff(2).toString(), '8');
			this.assert('high order term exponent of a', a.getMaxTerm().toString(), '3');
			this.assert('coeff of high order term of a', a.getCoeff(a.getMaxTerm()).toString(), '2');
			
			var b = new GF256Poly([2, 0, 1]);
			this.assert('b', b.toString(), 'x^2 + 2');
			a.modulo(b);
			this.assert('a%b', a.toString(), '7x + 16');
			
			var c = new GF256Poly(3, 3);
			this.assert('c', c.toString(), '3x^3');
			a.multiply(c);
			this.assert('a*c', a.toString(), '9x^4 + 48x^3');
		},

		EncodeNumText: function() {
			this.currentFunction = 'EncodeNumText';
			
			QR.QRDataEncoder.version = 3;
			QR.QRDataEncoder.text = "0123456789012345";
			QR.QRDataEncoder.textmode = QR.QRDataEncoder.TEXTMODE_NUM;
			QR.QRDataEncoder.encode();
			this.assert('QR.QRDataEncoder.dataBits (num)', QR.QRDataEncoder.dataBits, ['0001','0000010000','0000001100','0101011001','1010100110','1110000101','0011101010','0101']);
		},

		EncodeAlnumText: function() {
			this.currentFunction = 'EncodeAlnumText';
			
			QR.QRDataEncoder.version = 3;
			QR.QRDataEncoder.text = "AC-42";
			QR.QRDataEncoder.textmode = QR.QRDataEncoder.TEXTMODE_ALNUM;
			QR.QRDataEncoder.encode();
			this.assert('QR.QRDataEncoder.dataBits (alnum)', QR.QRDataEncoder.dataBits, ['0010','000000101','00111001110','11100111001','000010']);
		},
		
		FormatData: function() {
			this.currentFunction = 'FormatData';
			
			QR.QRCreator.format.mask = 4;
			QR.QRCreator.format.error = 0;
			this.assert('Format for mask 4, EC L', QR.QRCreator.format.getData(), parseInt("110011000101111", 2));
		},
		
		DataBits: function() {
			this.currentFunction = 'DataBits';
			
			QR.QRDataEncoder.version = 1;
			QR.QRDataEncoder.ECLevel = 2;
			QR.QRDataEncoder.text = "HELLO WORLD"
			QR.QRDataEncoder.textmode = QR.QRDataEncoder.TEXTMODE_ALNUM;
			QR.QRDataEncoder.dataCodewords = null;
			QR.QRDataEncoder.createDataCodewords();
			//alert(QR.QRDataEncoder.dataBits);
			//alert(QR.QRDataEncoder.dataCodewords);
			// TODO: assert, not alert
			
			// TODO: try these, I they're max length for version 2-L
			//QR.QRDataEncoder.text = "01234567890123456789012345678901234567890123456789012345678901234567890123456";
			//QR.QRDataEncoder.textmode = QR.QRDataEncoder.TEXTMODE_NUM;

			//QR.QRDataEncoder.text = "01234567890123456789012345678901234567890123456";
			//QR.QRDataEncoder.textmode = QR.QRDataEncoder.TEXTMODE_ALNUM;
			
			// this should truncate the text to 25 characters
			//QR.QRDataEncoder.version = 1;
			//QR.QRDataEncoder.ECLevel = 0;
			//QR.QRDataEncoder.text = "01234567890123456789012345678901234567890123456";
			//QR.QRDataEncoder.textmode = QR.QRDataEncoder.TEXTMODE_ALNUM;
			
		},
		
		ErrorCorrection: function() {
			this.currentFunction = 'ErrorCorrection';
			
			QR.QRDataEncoder.version = 2;
			QR.QRDataEncoder.ECLevel = 0;
			QR.QRDataEncoder.dataCodewordsAll = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
			QR.QRDataEncoder.dataCodewords = [QR.QRDataEncoder.dataCodewordsAll];
			
			QR.QRDataEncoder.generateECGenerator();
			this.assert('EC generator polynomial', QR.QRDataEncoder.ECGenerator.toString(), 'x^10 + 216x^9 + 194x^8 + 159x^7 + 111x^6 + 199x^5 + 94x^4 + 95x^3 + 113x^2 + 157x + 193');
			QR.QRDataEncoder.generateMessagePolynomial();
			this.assert('message polynomial', QR.QRDataEncoder.messages[0].toString(), '32x^15 + 91x^14 + 11x^13 + 120x^12 + 209x^11 + 114x^10 + 220x^9 + 77x^8 + 67x^7 + 64x^6 + 236x^5 + 17x^4 + 236x^3 + 17x^2 + 236x + 17');
			QR.QRDataEncoder.generateErrorPolynomial();
			this.assert('error polynomial', QR.QRDataEncoder.errorMessage.toString(), '196x^9 + 35x^8 + 39x^7 + 119x^6 + 235x^5 + 215x^4 + 231x^3 + 226x^2 + 93x + 23');
			this.assert('error codewords', QR.QRDataEncoder.errorCodewordsAll.toString(), '196,35,39,119,235,215,231,226,93,23');
		},
		
		ErrorCorrectionBlocks: function() {
			QR.QRDataEncoder.ECLevel = 2;
			QR.QRDataEncoder.version = 9;
			this.assert('9-Q error blocks', QR.QRDataEncoder.numDataBlocks(), [[4,16],[4,17]]);
			
			QR.QRDataEncoder.ECLevel = 3;
			QR.QRDataEncoder.version = 22;
			this.assert('22-H error blocks', QR.QRDataEncoder.numDataBlocks(), [[34,13]]);
			
			QR.QRDataEncoder.ECLevel = 1;
			QR.QRDataEncoder.version = 32;
			this.assert('32-M error blocks', QR.QRDataEncoder.numDataBlocks(), [[10,46],[23,47]]);
		},
		
		NumCodewords: function() {
			for (var version = 1; version <= 40; ++version)
			{
				var sum = QR.QRDataEncoder.numDataCodewords(version, 0) + QR.QRDataEncoder.numErrorCodewords(version, 0) * QR.QRDataEncoder.numErrorBlocks(version, 0);
				for (var ECLevel = 1; ECLevel <= 3; ++ECLevel)
				{
					var sumCheck = QR.QRDataEncoder.numDataCodewords(version, ECLevel) + QR.QRDataEncoder.numErrorCodewords(version, ECLevel) * QR.QRDataEncoder.numErrorBlocks(version, ECLevel);
					this.assert('Total Codewords version '+version+' EC '+ECLevel, sum, sumCheck);
				}
			
			}
			QR.QRDataEncoder.ECLevel = 2;
			QR.QRDataEncoder.version = 9;
			this.assert('9-Q error blocks', QR.QRDataEncoder.numDataBlocks(), [[4,16],[4,17]]);
			
			QR.QRDataEncoder.ECLevel = 3;
			QR.QRDataEncoder.version = 22;
			this.assert('22-H error blocks', QR.QRDataEncoder.numDataBlocks(), [[34,13]]);
			
			QR.QRDataEncoder.ECLevel = 1;
			QR.QRDataEncoder.version = 32;
			this.assert('32-M error blocks', QR.QRDataEncoder.numDataBlocks(), [[10,46],[23,47]]);
		},
		
		MinimumVersionRequired: function() {
			this.currentFunction = 'MinimumVersionRequired';
			
			QR.QRDataEncoder.ECLevel = 2;
			QR.QRDataEncoder.textmode = QR.QRDataEncoder.TEXTMODE_NUM;
			QR.QRDataEncoder.text = '1234567890123456789012345678901234567890123456789'; // 49 chars
			this.assert('num minimum version', QR.QRDataEncoder.getMinimumVersionRequired(), 3);
			
			QR.QRDataEncoder.ECLevel = 3;
			QR.QRDataEncoder.textmode = QR.QRDataEncoder.TEXTMODE_ALNUM;
			QR.QRDataEncoder.text = '1234567890123456789012345678901234567890'; // 40 chars
			this.assert('alnum minimum version', QR.QRDataEncoder.getMinimumVersionRequired(), 4);
			
			QR.QRDataEncoder.ECLevel = 1;
			QR.QRDataEncoder.textmode = QR.QRDataEncoder.TEXTMODE_BYTE;
			QR.QRDataEncoder.text = '1234567890123456789012345678901234567890123456789'; // 49 chars
			this.assert('byte minimum version', QR.QRDataEncoder.getMinimumVersionRequired(), 4);
		},

		// TODO: more unit tests
		
		RunAllUnitTests: function() {
			QRUnitTests.GF256Values();
			QRUnitTests.GF256Poly();
			QRUnitTests.EncodeNumText();
			QRUnitTests.EncodeAlnumText();
			QRUnitTests.FormatData();
			QRUnitTests.DataBits();
			QRUnitTests.ErrorCorrection();
			QRUnitTests.ErrorCorrectionBlocks();
			QRUnitTests.NumCodewords();
			QRUnitTests.MinimumVersionRequired();
			//QRUnitTests.MaxCharactersAllowed
		}
	}
	
	return QRUnitTests;
});