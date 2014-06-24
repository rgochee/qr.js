define(function (require) {
	var utils = require('../../lib/externalUtils');
	var BinMath = require('../../math/binmath');
	//var GF256 = require('../../math/GF256/GF256');
	var GF256Poly = require('../../math/GF256/GF256Poly');
	var MatrixBarcode = require('../MatrixBarcode');

	// singleton that acts as our data encoder
	var QRDataEncoder = {
		// constants
		TEXTMODE_NUM:    1,
		TEXTMODE_ALNUM:  2,
		TEXTMODE_BYTE:   4,
		TEXTMODE_KANJI:  8, // unsupported
		TEXTMODE_APPEND: 3, // unsupported
		TEXTMODE_ECI:    7, // unsupported
		TEXTMODE_FNC11:  5, // unsupported
		TEXTMODE_FNC12:  9, // unsupported
		TEXTMODE_EOM:    0,
		
		ECLEVEL_L: 0,
		ECLEVEL_M: 1,
		ECLEVEL_Q: 2,
		ECLEVEL_H: 3,
		
		// local vars
		text: "",
		textmode: this.TEXTMODE_EOM, // NOTE: mixed modes are unsupported, but it shouldn't be _too_ hard to code.
									 // the interface could change to: SetText()/AppendText() with this.text[{text,mode}, ...]
									 // likewise, a bunch of helper functions should be fixed, like getMinimumVersionRequired(), encodeBits(), etc.
		data: null,
		dataLength: 0,
		dataBits: null,
		dataCodewords: null,
		version: 2,
		ECLevel: 0, // 0=L, 1=M, 2=Q, 3=H
		
		// functions
		
		// Returns the number of data bits for each code of a given string
		numDataBits : function(count, textmode) {
			if (typeof(textmode) == 'undefined')
			{
				textmode = this.textmode;
			}
			
			switch (textmode)
			{
				case this.TEXTMODE_NUM:
					if (count >= 3) {
						// each trio of characters is represented by a 10-bit string
						return 10;
					}
					if (count == 2) {
						// a terminal pair of characters is represented by a 7-bit string
						return 7;
					}
					if (count == 1) {
						// a single terminal character is represented by a 4-bit string
						return 4;
					}
				break;
				case this.TEXTMODE_ALNUM:
					if (count >= 2) {
						// each pair of characters is represented by an 11-bit string
						return 11;
					}
					if (count == 1) {
						// a terminal character is represented by a 6-bit string
						return 6;
					}
				break;
				case this.TEXTMODE_BYTE:
					// each character represented by an 8-bit string
					return 8;
				break;
				case this.TEXTMODE_KANJI:
					// each character represented by a 13-bit string
					return 13;
				break;
			}
			// unknown text mode
			return 0;
		},
		
		// Returns the number of bits for the character count indicator
		numCountBits : function(version, textmode) {
			if (typeof(version) == 'undefined')
			{
				version = this.version;
			}
			if (typeof(textmode) == 'undefined')
			{
				textmode = this.textmode;
			}
			
			// check for invalid version
			if (version <= 0 || version > 40) {
				return 0;
			}
			
			// Byte mode has simple count bits
			if (textmode == this.TEXTMODE_BYTE) {
				if (version <= 9) {
					return 8;
				} else {
					return 16;
				}
			}
			
			// num, alnum and kanji are more complicated.
			// it can be seen as a base count that's incremented by 2 at two different points
			var count = 0;
			switch (textmode)
			{
				case this.TEXTMODE_NUM:
					count = 10;
				break;
				case this.TEXTMODE_ALNUM:
					count = 9;
				break;
				case this.TEXTMODE_KANJI:
					count = 8;
				break;
				// invalid mode
				default:
					return 0;
			}
			// version 10+ needs additional 2 bits
			if (version >= 10) {
				count += 2;
			}
			// version 27+ need another additional 2 bits
			if (version >= 27)
			{
				count += 2;
			}
			
			return count;
		},
		
		// Returns the number of required data codewords for the specified QR code version+level
		numDataCodewords: function(version, ECLevel) {
			if (typeof(version) == 'undefined')
			{
				version = this.version;
			}
			if (typeof(ECLevel) == 'undefined')
			{
				ECLevel = this.ECLevel;
			}
			
			var dataCodewords = [[]
								,[19, 16, 13, 9] //1
								,[34, 28, 22, 16] //2
								,[55, 44, 34, 26] //3
								,[80, 64, 48, 36] //4
								,[108, 86, 62, 46] //5
								,[136, 108, 76, 60] //6
								,[156, 124, 88, 66] //7
								,[194, 154, 110, 86] //8
								,[232, 182, 132, 100] //9
								,[274, 216, 154, 122] //10
								,[324, 254, 180, 140] //11
								,[370, 290, 206, 158] //12
								,[428, 334, 244, 180] //13
								,[461, 365, 261, 197] //14
								,[523, 415, 295, 223] //15
								,[589, 453, 325, 253] //16
								,[647, 507, 367, 283] //17
								,[721, 563, 397, 313] //18
								,[795, 627, 445, 341] //19
								,[861, 669, 485, 385] //20
								,[932, 714, 512, 406] //21
								,[1006, 782, 568, 442] //22
								,[1094, 860, 614, 464] //23
								,[1174, 914, 664, 514] //24
								,[1276, 1000, 718, 538] //25
								,[1370, 1062, 754, 596] //26
								,[1468, 1128, 808, 628] //27
								,[1531, 1193, 871, 661] //28
								,[1631, 1267, 911, 701] //29
								,[1735, 1373, 985, 745] //30
								,[1843, 1455, 1033, 793] //31
								,[1955, 1541, 1115, 845] //32
								,[2071, 1631, 1171, 901] //33
								,[2191, 1725, 1231, 961] //34
								,[2306, 1812, 1286, 986] //35
								,[2434, 1914, 1354, 1054] //36
								,[2566, 1992, 1426, 1096] //37
								,[2702, 2102, 1502, 1142] //38
								,[2812, 2216, 1582, 1222] //39
								,[2956, 2334, 1666, 1276] //40 
								];
			return dataCodewords[version][ECLevel]
		},
		
		// Returns the number of required error codewords per block for the specified QR code version+level
		numErrorCodewords: function(version, ECLevel) {
			if (typeof(version) == 'undefined')
			{
				version = this.version;
			}
			if (typeof(ECLevel) == 'undefined')
			{
				ECLevel = this.ECLevel;
			}
			
			var dataECCodewords = [[]
								,[7, 10, 13, 17] //1
								,[10, 16, 22, 28] //2
								,[15, 26, 18, 22] //3
								,[20, 18, 26, 16] //4
								,[26, 24, 18, 22] //5
								,[18, 16, 24, 28] //6
								,[20, 18, 18, 26] //7
								,[24, 22, 22, 26] //8
								,[30, 22, 20, 24] //9
								,[18, 26, 24, 28] //10
								,[20, 30, 28, 24] //11
								,[24, 22, 26, 28] //12
								,[26, 22, 24, 22] //13
								,[30, 24, 20, 24] //14
								,[22, 24, 30, 24] //15
								,[24, 28, 24, 30] //16
								,[28, 28, 28, 28] //17
								,[30, 26, 28, 28] //18
								,[28, 26, 26, 26] //19
								,[28, 26, 30, 28] //20
								,[28, 26, 28, 30] //21
								,[28, 28, 30, 24] //22
								,[30, 28, 30, 30] //23
								,[30, 28, 30, 30] //24
								,[26, 28, 30, 30] //25
								,[28, 28, 28, 30] //26
								,[30, 28, 30, 30] //27
								,[30, 28, 30, 30] //28
								,[30, 28, 30, 30] //29
								,[30, 28, 30, 30] //30
								,[30, 28, 30, 30] //31
								,[30, 28, 30, 30] //32
								,[30, 28, 30, 30] //33
								,[30, 28, 30, 30] //34
								,[30, 28, 30, 30] //35
								,[30, 28, 30, 30] //36
								,[30, 28, 30, 30] //37
								,[30, 28, 30, 30] //38
								,[30, 28, 30, 30] //39
								,[30, 28, 30, 30] //40
								];
			return dataECCodewords[version][ECLevel]
		},
		
		// Returns the number of required error correction blocks for the specified QR code version+level
		numErrorBlocks: function(version, ECLevel) {
			if (typeof(version) == 'undefined')
			{
				version = this.version;
			}
			if (typeof(ECLevel) == 'undefined')
			{
				ECLevel = this.ECLevel;
			}
			
			var dataECBlocks = [[]
								,[1, 1, 1, 1] //1
								,[1, 1, 1, 1] //2
								,[1, 1, 2, 2] //3
								,[1, 2, 2, 4] //4
								,[1, 2, 4, 4] //5
								,[2, 4, 4, 4] //6
								,[2, 4, 6, 5] //7
								,[2, 4, 6, 6] //8
								,[2, 5, 8, 8] //9
								,[4, 5, 8, 8] //10
								,[4, 5, 8, 11] //11
								,[4, 8, 10, 11] //12
								,[4, 9, 12, 16] //13
								,[4, 9, 16, 16] //14
								,[6, 10, 12, 18] //15
								,[6, 10, 17, 16] //16
								,[6, 11, 16, 19] //17
								,[6, 13, 18, 21] //18
								,[7, 14, 21, 25] //19
								,[8, 16, 20, 25] //20
								,[8, 17, 23, 25] //21
								,[9, 17, 23, 34] //22
								,[9, 18, 25, 30] //23
								,[10, 20, 27, 32] //24
								,[12, 21, 29, 35] //25
								,[12, 23, 34, 37] //26
								,[12, 25, 34, 40] //27
								,[13, 26, 35, 42] //28
								,[14, 28, 38, 45] //29
								,[15, 29, 40, 48] //30
								,[16, 31, 43, 51] //31
								,[17, 33, 45, 54] //32
								,[18, 35, 48, 57] //33
								,[19, 37, 51, 60] //34
								,[19, 38, 53, 63] //35
								,[20, 40, 56, 66] //36
								,[21, 43, 59, 70] //37
								,[22, 45, 62, 74] //38
								,[24, 47, 65, 77] //39
								,[25, 49, 68, 81] //40
								];
			return dataECBlocks[version][ECLevel]
		},
		
		numDataBlocks: function(version, ECLevel) {
			if (typeof(version) == 'undefined')
			{
				version = this.version;
			}
			if (typeof(ECLevel) == 'undefined')
			{
				ECLevel = this.ECLevel;
			}
			
			var numBlocks = this.numErrorBlocks(version, ECLevel);
			var numDataCodewordsTotal = this.numDataCodewords(version, ECLevel);
			
			var numDataCodewordsGroup1 = Math.floor(numDataCodewordsTotal / numBlocks);
			var numDataCodewordsGroup2 = numDataCodewordsGroup1 + 1;
			
			var numBlocksGroup2 = numDataCodewordsTotal % numBlocks;
			var numBlocksGroup1 = numBlocks - numBlocksGroup2;
			
			if (numBlocksGroup2 == 0)
			{
				//numDataCodewordsGroup2 = 0;
				return [[numBlocksGroup1, numDataCodewordsGroup1]];
			}
			
			return [[numBlocksGroup1, numDataCodewordsGroup1], [numBlocksGroup2, numDataCodewordsGroup2]];
		},
		
		// Calculates minimum version requried given text encoding and error correction level
		getMinimumVersionRequired: function() {
			var charCount = this.text.length;
			
			// wrap the following into a numBitsRequired function?
			var bitsRequired = 0;
			if (this.textmode == this.TEXTMODE_NUM)
			{
				while (charCount > 0)
				{
					bitsRequired += this.numDataBits(charCount);
					charCount -= 3;
				}
			}
			else if (this.textmode == this.TEXTMODE_ALNUM)
			{
				while (charCount > 0)
				{
					bitsRequired += this.numDataBits(charCount);
					charCount -= 2;
				}
			}
			else if (this.textmode == this.TEXTMODE_BYTE)
			{
				bitsRequired = charCount * 8;
			}
			else if (this.textmode == this.TEXTMODE_KANJI)
			{
				bitsRequired = charCount * 13;
			}
			else
			{
				return 0;
			}
			
			// Now that we know how many bits we need, find the smallest version that gives it to us
			for (var version = 1; version < 40; ++version)
			{
				var totalBits = this.numDataCodewords(version)*8; // data blocks -> bits
				totalBits -= 4; // subtract encoding bits
				totalBits -= this.numCountBits(version); // subtract character count bits
				
				if (totalBits >= bitsRequired)
				{
					return version;
				}
			}
			
			return 0;
		},
		
		maxCharactersAllowed: function(version, ECLevel) {
			var totalBits = this.numDataCodewords(version, ECLevel)*8; // data blocks -> bits
			totalBits -= 4; // subtract encoding bits
			totalBits -= this.numCountBits(version); // subtract character count bits

			if (this.textmode == this.TEXTMODE_NUM)
			{
				var numChars = Math.floor(totalBits / 10)*3;
				if (totalBits % 10 >= 7)
				{
					numChars++;
				}
				if (totalBits % 10 >= 4)
				{
					numChars++;
				}
				return numChars;
			}
			else if (this.textmode == this.TEXTMODE_ALNUM)
			{
				var numChars = Math.floor(totalBits / 11)*2;
				if (totalBits % 11 >= 6)
				{
					numChars++;
				}
				return numChars;
			}
			else if (this.textmode == this.TEXTMODE_BYTE)
			{
				return Math.floor(totalBits / 8);
			}
			else if (this.textmode == this.TEXTMODE_KANJI)
			{
				return Math.floor(totalBits / 13);
			}
			else
			{
				return 0;
			}
		},
		
		zeroPadBitsBase2: function(num, length) {
			// assumes that no input will be more than 16 bits
			return ("0000000000000000" + num.toString(2)).slice(-length);
		},
		
		encodeChar: function(ch, textmode) {
			if (!textmode)
			{
				textmode = this.textmode;
			}
			if (textmode == this.TEXTMODE_NUM) {
				if (ch >= "0" && ch <= "9") {
					return ch.charCodeAt(0)-0x30;
				}
			}
			if (textmode == this.TEXTMODE_ALNUM) {
				var code = ch.charCodeAt(0);
				if (ch >= "0" && ch <= "9") {
					return code-0x30;
				}
				if (ch.toUpperCase() >= "A" && ch.toUpperCase() <= "Z") {
					return code-0x41+10;
				}
				switch (ch) {
					case " ":
						return 36;
					case "$":
						return 37;
					case "%":
						return 38;
					case "*":
						return 39;
					case "+":
						return 40;
					case "-":
						return 41;
					case ".":
						return 42;
					case "/":
						return 43;
					case ":":
						return 44;
				}
			}
			if (textmode == this.TEXTMODE_BYTE) {
				return ch.charCodeAt(0);
			}
			// NOTE: Kanji not currently supported
			return 0;
		},
		
		encodeData: function() {
			// first, chip off the text if it's too long.
			var maxChars = this.maxCharactersAllowed();
			if (maxChars < this.text.length)
			{
				this.text = this.text.substring(0,maxChars);
			}
			
			if (this.textmode == this.TEXTMODE_NUM) {
				var i = 0;
				this.data = [this.TEXTMODE_NUM, this.text.length];
				while (i < this.text.length) {
					var num = 0;
					for (var j = 0; j < 3 && i+j < this.text.length; ++j)
					{
						num = 10*num + this.encodeChar(this.text[i+j]);
					}
					this.data.push(num);
					i+=3;
				}
			} else if (this.textmode == this.TEXTMODE_ALNUM) {
				var i = 0;
				this.data = [this.TEXTMODE_ALNUM, this.text.length];
				while (i < this.text.length-1) {
					this.data.push(this.encodeChar(this.text[i])*45+this.encodeChar(this.text[i+1]));
					i+=2;
				}
				if (i == this.text.length-1)
				{
					this.data.push(this.encodeChar(this.text[i]));
					i++;
				}
			} else if (this.textmode == this.TEXTMODE_BYTE) {
				this.data = [this.TEXTMODE_BYTE, this.text.length];
				for (var i = 0; i < this.text.length; ++i) {
					this.data.push(this.encodeChar(this.text[i]));
				}
			}
		},
		
		encodeBits: function() {
			if (this.data.length < 2) {
				// input error
				return;
			}
			this.dataBits = [];
			// mode
			this.dataBits[0] = this.zeroPadBitsBase2(this.data[0], 4);
			this.dataLength = 4;
			// data count
			this.dataBits[1] = this.zeroPadBitsBase2(this.data[1], this.numCountBits());
			this.dataLength += this.numCountBits();
			// data
			var charCount = this.data[1];
			for (var i = 2; i < this.data.length; ++i) {
				var numDataBits = this.numDataBits(charCount);
				this.dataBits[i] = this.zeroPadBitsBase2(this.data[i], numDataBits);
				this.dataLength += numDataBits;
				if (this.textmode == this.TEXTMODE_NUM) {
					charCount -= 3;
				} else if (this.textmode == this.TEXTMODE_ALNUM) {
					charCount -= 2;
				} else {
					charCount--;
				}
			}
		},
		
		encode: function() {
			this.encodeData();
			this.encodeBits();
		},
		
		finalizeDataBits: function() {
			this.dataBits[this.dataBits.length] = "0000";
		},
		
		convertBitsToCodewords: function() {
			var allDataBits = this.dataBits.join("");
			this.dataCodewordsAll = [];
			while (allDataBits.length > 8)
			{
				this.dataCodewordsAll.push(parseInt(allDataBits.substring(0,8), 2));
				allDataBits = allDataBits.substring(8);
			}
			if (allDataBits.length > 0)
			{
				allDataBits += "00000000";
				this.dataCodewordsAll.push(parseInt(allDataBits.substring(0,8), 2));
			}
			
			var maxDataSize = this.numDataCodewords();
			while (this.dataCodewordsAll.length < maxDataSize)
			{
				this.dataCodewordsAll.push(236);
				this.dataCodewordsAll.push(17);
			}
			
			if (this.dataCodewordsAll.length > maxDataSize)
			{
				this.dataCodewordsAll.length = maxDataSize;
			}
		},
		
		interleaveDataCodewords: function() {
			this.dataCodewords = [];
			var codewordsTotal = 0;
			var blocksTotal = 0;
			var blockGroups = this.numDataBlocks();
			for (var blockGroup = 0; blockGroup < blockGroups.length; ++blockGroup)
			{
				for (var block = 0; block < blockGroups[blockGroup][0]; ++block, ++blocksTotal)
				{
					this.dataCodewords[blocksTotal] = [];
					for (var codeword = 0; codeword < blockGroups[blockGroup][1]; ++codeword, ++codewordsTotal)
					{
						this.dataCodewords[blocksTotal][codeword] = this.dataCodewordsAll[codewordsTotal];
					}
				}
			}
			
			this.dataCodewordsInt = [];
			for (var i = 0; i < blockGroups[0][1]+1; ++i) // HACKY
			{
				for (var j = 0; j < this.numErrorBlocks(); ++j)
				{
					if (typeof(this.dataCodewords[j][i]) != 'undefined')
					{
						this.dataCodewordsInt.push(this.dataCodewords[j][i]);
					}
				}
			}
		},
		
		createDataCodewords: function() {
			this.encode();
			this.finalizeDataBits();
			this.convertBitsToCodewords();
			this.interleaveDataCodewords();
		},
		
		generateECGenerator: function() {
			this.ECGenerator = new GF256Poly([1, 1])
			for (var i = 1; i < this.numErrorCodewords(); ++i)
			{
						this.ECGenerator.multiply(new GF256Poly([i, 0], undefined, true));
			}
		},
		
		generateMessagePolynomial: function() {
			this.messages = [];
			
			var ECBlockGroups = this.numDataBlocks();
			
			var codewordsTotal = 0;
			var blockTotal = 0;
			for (var blockGroup = 0; blockGroup < ECBlockGroups.length; ++blockGroup)
			{
				for (var block = 0; block < ECBlockGroups[blockGroup][0]; ++block, ++blockTotal)
				{
					this.messages[blockTotal] = new GF256Poly();
					for (var codeword = 0; codeword < ECBlockGroups[blockGroup][1]; ++codeword, ++codewordsTotal)
					{
						this.messages[blockTotal].set(this.dataCodewords[blockTotal][this.dataCodewords[blockTotal].length-codeword-1], codeword);
					}
				}
			}
			// assert( codewordsTotal == this.dataCodewordsAll.length );
		},
		
		generateErrorPolynomial: function() {
			this.errorCodewords = [];
			this.errorCodewordsAll = [];
			for (var i = 0; i < this.messages.length; ++i)
			{
				this.errorMessage = utils.clone(this.messages[i]); // TODO: handle bigger block sizes
				this.errorMessage.multiply(new GF256Poly(1, this.ECGenerator.getMaxTerm()));
				this.errorMessage.modulo(this.ECGenerator);
				this.errorCodewords[i] = [];
			
				for (var j = 0; j <= this.errorMessage.getMaxTerm(); ++j)
				{
					this.errorCodewordsAll.push(this.errorMessage.getCoeff(this.errorMessage.getMaxTerm()-j));
					this.errorCodewords[i][j] = this.errorMessage.getCoeff(this.errorMessage.getMaxTerm()-j);
				}
			}
		},
		
		interleaveErrorCodewords: function() {
			this.errorCodewordsInt = [];
			for (var i = 0; i < this.numErrorCodewords(); ++i)
			{
				for (var j = 0; j < this.numErrorBlocks(); ++j)
				{
					this.errorCodewordsInt.push(this.errorCodewords[j][i]);
				}
			}
		},
		
		createErrorCodewords: function() {
			this.generateECGenerator();
			this.generateMessagePolynomial();
			this.generateErrorPolynomial();
			this.interleaveErrorCodewords();
		}
	}

	var QRCreator = {
		// local vars
		blockPos: null,
		blockDir: null,

		// version sub-structure
		version: {
			number: 2,
			getData: function() {
				var BCHPoly18_6 = 0x1F25;
				var verData = this.number << BinMath.log(BCHPoly18_6);
				var BCHData = BinMath.modulo(verData, BCHPoly18_6);
				return verData | BCHData;
			}
		},
		
		// format sub-structure
		format: {
			mask: 0,
			error: 0,
			getData: function() {
				var BCHPoly15_5 = 0x537;
				var infoData = ((this.getECBitSequence()<<3) | this.mask ) << BinMath.log(BCHPoly15_5);
				var BCHData = BinMath.modulo(infoData, BCHPoly15_5);
				var unmaskedData = infoData | BCHData;
				var dataMask = 0x5412;
				return unmaskedData ^ dataMask;
			},
			shouldMask: function(i,j) {
				switch (this.mask) {
					case 0:
						return (i+j)%2==0;
					case 1:
						return i%2==0;
					case 2:
						return j%3==0;
					case 3:
						return (i+j)%3==0;
					case 4:
						return (Math.floor(i/2)+Math.floor(j/3))%2==0;
					case 5:
						return (i*j)%2+(i*j)%3==0;
					case 6:
						return ((i*j)%2+(i*j)%3)%2==0;
					case 7:
						return ((i+j)%2+(i*j)%3)%2==0;
					default:
						return 0;
				}
			},
			getECBitSequence: function() {
				return this.error ^ 1;
			}
		},
		
		myQRDataEncoder: QRDataEncoder,
		
		// Modify data
		setText: function(text, textmode) {
			if (!textmode)
			{
				textmode = this.myQRDataEncoder.TEXTMODE_BYTE;
			}
			this.myQRDataEncoder.text = text;
			this.myQRDataEncoder.textmode = textmode;
		},
		
		setVersion: function(ver) {
			this.version.number = ver;
			this.myQRDataEncoder.version = ver;
		},
		
		setECLevel: function(EC) {
			this.format.error = EC;
			this.myQRDataEncoder.ECLevel = EC;
		},

		reset: function() {
			this.addText('', 0);
			this.setVersion(1);
			this.setECLevel(0);
			MatrixBarcode.resetCanvas();
			this.blockPos = null;
			this.blockDir = null;
		},
		
		//
		// helper functions
		//
		
		getWidth: function() {
			return 17+4*this.version.number;
		},
		getX: function(x) {
			if (x < 0 || x > this.getWidth()) {
				return null;
			}
			return x+4;
		},
		getY: function(y) {
			return this.getX(y);
		},
		
		//
		// drawing functions
		//
		getModule: function(x, y) {
			return MatrixBarcode.getModule(this.getX(x), this.getY(y));
		},
		drawModule: function(x, y, fill) {
			MatrixBarcode.drawModule(this.getX(x), this.getY(y), fill);
		},
		drawSquare: function(x, y, size, fill) {
			MatrixBarcode.drawSquare(this.getX(x), this.getY(y), size, fill);
		},
		drawAlternating: function(x, y, len, dir) {
			MatrixBarcode.drawAlternating(this.getX(x), this.getY(y), len, dir);
		},
		
		// adding data
		
		addBlock: function(block) {
			if (this.blockPos.X < 0) {
				return;
			}
			for (var i = 7; i >= 0; --i) {
				var value = (block >> i) & 1;
				// try to put it in
				// NOTE: this is somewhat of a hack
				// it works by requiring that we init the structural parts of the QR code so we can assume anything null is where data goes
				if (this.getModule(this.blockPos.X+1, this.blockPos.Y) == null) {
					this.drawModule(this.blockPos.X+1, this.blockPos.Y, value);
					continue;
				} else if (this.getModule(this.blockPos.X, this.blockPos.Y) == null) {
					this.drawModule(this.blockPos.X, this.blockPos.Y, value);
					continue;
				}
				
				// no good... let's move to the next block pos
				this.incrementBlockPos();
				++i;
			}
		},
		
		addDataBlocks: function(dataCodewords) {
			for (var i = 0; i < dataCodewords.length; ++i)
			{
				this.addBlock(dataCodewords[i]);
			}
		},
		
		// helper function for the above ensure proper placement of data blocks
		incrementBlockPos: function() {
			function moveBlockPosLeft(parent) {
				parent.blockPos.X-=2;
				parent.blockDir ^= 1;
				if (parent.blockPos.X == 5) {
					// not right! get past the timing here
					parent.blockPos.X--;
				}
			}
			if (this.blockDir == 0) {
				// moving up!
				if (this.blockPos.Y == 0) {
					// don't go too far up, let's move left and change directions
					moveBlockPosLeft(this);
				} else {
					this.blockPos.Y--;
				}
				} else {
				// moving down!
				if (this.blockPos.Y == this.getWidth()-1) {
					// don't go too far down, let's move left and change directions
					moveBlockPosLeft(this);
				} else {
					this.blockPos.Y++;
				}
			}
		},
		
		// formatting/encoding/structure
		
		drawPosition: function(x,y) {
			MatrixBarcode.drawSquare(this.getX(x)-1, this.getY(y)-1, 9, false); // hack. or I could have getX not return NULL?
			this.drawSquare(x  , y  , 7, true );
			this.drawSquare(x+1, y+1, 5, false);
			this.drawSquare(x+2, y+2, 3, true );
		},
		drawAlignment: function(x,y) {
			this.drawSquare(x-2, y-2, 5, true );
			this.drawSquare(x-1, y-1, 3, false);
			this.drawModule( x  , y  ,    true );
		},
		
		drawAlignments: function() {
			if (this.version.number == 1)
			{
				return;
			}
			
			// We add 1 new row/col of alignment patterns every 7 patterns
			// The patterns are placed with as equal of spacing as possible
			// with an irregular spacing only between the first and second 
			// coordinates and the first and last coordinates are anchored 
			// to 6 and width-7.
			// Also, spacing must at an even number to match with timing
			// Based on this, we can algorithmically generate this list if we want.
			// This list describes the distance between each pattern from
			// the second to the last. The distance to the first and second
			// is whatever is left over
			var differences = [0, 0, 0, 0, 0, 0, 0,        // 1-6
							   16, 18, 20, 22, 24, 26, 28, // 7-13
							   20, 22, 24, 24, 26, 28, 28, // 14-20
							   22, 24, 24, 26, 26, 28, 28, // 21-27
							   24, 24, 26, 26, 26, 28, 28, // 28-34
							   24, 26, 26, 26, 28, 28];    // 35-40
							   
			var maxNum = Math.floor(this.version.number / 7)+1;
			
			// versions 2-6
			if (maxNum == 1) {
				this.drawAlignment(this.getWidth()-7,this.getWidth()-7);
			}
			
			for (var i = 0; i <= maxNum; ++i) {
				for (var j = 0; j <= maxNum; ++j) {
					// Skip coordinates that overlap with position patterns
					if ((i == maxNum && j == maxNum) ||
						(i == 0      && j == maxNum) ||
						(i == maxNum && j == 0     ) )
					{
						continue;
					}
					
					var x = this.getWidth()-7-differences[this.version.number]*i;
					var y = this.getWidth()-7-differences[this.version.number]*j;
					
					if (i == maxNum)
					{
						x = 6;
					}
					if (j == maxNum)
					{
						y = 6;
					}
					
					this.drawAlignment(x,y);
				}
			}
		},
		
		clearQuietZone: function() {
			MatrixBarcode.drawRect(0, 0, 4, this.getWidth()+8, false);
			MatrixBarcode.drawRect(this.getWidth()+4, 0, 4, this.getWidth()+8, false);
			MatrixBarcode.drawRect(4, 0, this.getWidth(), 4, false);
			MatrixBarcode.drawRect(4, this.getWidth()+4, this.getWidth(), 4, false);
		},
		
		// main functions
		setupCanvas: function(canvas, size) {
			MatrixBarcode.setupCanvas(canvas, size);
		},
		reset: function() {
			MatrixBarcode.resetGrid();
		},

		initGrid: function(version) {
			if (!version)
			{
				version = this.myQRDataEncoder.getMinimumVersionRequired();
			}
			
			// do not accept invalid versions
			if (version < 1 || version > 40)
			{
				return;
			}
			
			this.setVersion(version);
			
			MatrixBarcode.initGrid(this.getWidth()+8);
			
			this.blockPos = {X:this.getWidth()-2,
			                 Y:this.getWidth()-1};
			this.blockDir = 0;
			
			this.initStructure();
		},
		
		initStructure: function() {
			this.drawPatterns();
			this.drawVersion();
			this.drawFormat();
		},
		
		maskGrid: function(mask) {
			if (typeof mask == 'undefined') {
				this.selectMask();
			}
			else
			{
				this.format.mask = mask;
				for (var i = 0; i < this.getWidth(); ++i) {
					for (var j = 0; j < this.getWidth(); ++j) {
						if (this.format.shouldMask(i,j))
						{
							MatrixBarcode.invertModule(j+4, i+4);
						}
					}
				}
			
				// reinit the structure because it shouldn't be masked.
				this.initStructure();
			}
		},
		
		selectMask: function() {
			var minScore = 100000;
			var bestMask = -1;
				
			for (var i = 0; i < 8; ++i)
			{
				// now mask and score
				this.maskGrid(i);
				var score = this.scoreQR();
				if (score < minScore)
				{
					minScore = score;
					bestMask = i;
				}
				
				// now unmask
				this.maskGrid(i);
			}
			
			// best mask is complete!
			this.maskGrid(bestMask);
				
			return bestMask;
		},
		
		scoreQR: function() {
			// score 1
			var score1 = 0;
			
			//horizontal
			for (var i = 0; i < this.getWidth(); ++i) {
				for (var j = 0; j < this.getWidth(); ++j) {
					var color = this.getModule(i,j);
					var k;
					for (k = 1; k < this.getWidth() - j; ++k)
					{
						if (this.getModule(i,j+k) != color)
						{
							break;
						}
					}
					if (k >= 5)
					{
						score1 += 3 + k-5;
						j += k-5;
					}
				}
			}
			//vertical
			for (var i = 0; i < this.getWidth(); ++i) {
				for (var j = 0; j < this.getWidth(); ++j) {
					var color = this.getModule(i,j);
					var k;
					for (k = 1; k < this.getWidth() - i; ++k)
					{
						if (this.getModule(i+k,j) != color)
						{
							break;
						}
					}
					if (k >= 5)
					{
						countScore1 = 3 + k-5;
						j += k-5;
					}
				}
			}
			
			//score2
			var score2 = 0;
			for (var i = 0; i < this.getWidth()-1; ++i) {
				for (var j = 0; j < this.getWidth()-1; ++j) {
					var color = this.getModule(i,j);
					if (this.getModule(i+1,j  ) != color ||
						this.getModule(i  ,j+1) != color ||
						this.getModule(i+1,j+1) != color )
					{
						continue;
					}
					score2 += 3;
				}
			}
			
			//score3
			var score3 = 0;
			for (var i = 0; i < this.getWidth()-10; ++i) {
				for (var j = 0; j < this.getWidth()-10; ++j) {
					if (this.getModule(i,j   ) == 0 &&
						this.getModule(i,j+1 ) == 0 &&
						this.getModule(i,j+2 ) == 0 &&
						this.getModule(i,j+3 ) == 0 &&
						this.getModule(i,j+4 ) == 1 &&
						this.getModule(i,j+5 ) == 0 &&
						this.getModule(i,j+6 ) == 1 &&
						this.getModule(i,j+7 ) == 1 &&
						this.getModule(i,j+8 ) == 1 &&
						this.getModule(i,j+9 ) == 0 &&
						this.getModule(i,j+10) == 1 )
					{
						score3 += 40;
					}
					if (this.getModule(i,j   ) == 1 &&
						this.getModule(i,j+1 ) == 0 &&
						this.getModule(i,j+2 ) == 1 &&
						this.getModule(i,j+3 ) == 1 &&
						this.getModule(i,j+4 ) == 1 &&
						this.getModule(i,j+5 ) == 0 &&
						this.getModule(i,j+6 ) == 1 &&
						this.getModule(i,j+7 ) == 0 &&
						this.getModule(i,j+8 ) == 0 &&
						this.getModule(i,j+9 ) == 0 &&
						this.getModule(i,j+10) == 0 )
					{
						score3 += 40;
					}
					if (this.getModule(i  ,j) == 0 &&
						this.getModule(i+1,j) == 0 &&
						this.getModule(i+2,j) == 0 &&
						this.getModule(i+3,j) == 0 &&
						this.getModule(i+4,j) == 1 &&
						this.getModule(i+5,j) == 0 &&
						this.getModule(i+6,j) == 1 &&
						this.getModule(i+7,j) == 1 &&
						this.getModule(i+8,j) == 1 &&
						this.getModule(i+9,j) == 0 &&
						this.getModule(i+1,j) == 1 )
					{
						score3 += 40;
					}
					if (this.getModule(i  ,j) == 1 &&
						this.getModule(i+1,j) == 0 &&
						this.getModule(i+2,j) == 1 &&
						this.getModule(i+3,j) == 1 &&
						this.getModule(i+4,j) == 1 &&
						this.getModule(i+5,j) == 0 &&
						this.getModule(i+6,j) == 1 &&
						this.getModule(i+7,j) == 0 &&
						this.getModule(i+8,j) == 0 &&
						this.getModule(i+9,j) == 0 &&
						this.getModule(i+1,j) == 0 )
					{
						score3 += 40;
					}
				}
			}
			
			//score4
			var score4 = 0;
			var countBlack = 0;
			for (var i = 0; i < this.getWidth()-1; ++i) {
				for (var j = 0; j < this.getWidth()-1; ++j) {
					if (this.getModule(i,j) == 1)
					{
						countBlack++;
					}
				}
			}
			var percent = (countBlack * 100) / (this.getWidth() * this.getWidth())
			var prev5 = Math.floor(percent / 20);
			var next5 = prev5 + 1;
			prev5 = Math.abs(prev5-10);
			next5 = Math.abs(next5-10);
			score4 = Math.min(prev5,next5)*10;
			
			// TODO: move subscores into individual functions and do unit tests
			return score1+score2+score3+score4;
		},
		
		drawPatterns: function() {
			var width = this.getWidth();
			// position detection patterns
			this.drawPosition(0,0);
			this.drawPosition(width-7,0);
			this.drawPosition(0,width-7);
			
			// timing patterns
			this.drawAlternating(8,6,width-16,'r');
			this.drawAlternating(6,8,width-16,'d');
			
			// alignment patterns
			this.drawAlignments();
			
			// quiet zone
			this.clearQuietZone();
		},
		
		drawFormat: function() {
			var format = this.format.getData();
			var width = this.getWidth();
			
			// horizontal
			this.drawModule(width-1, 8, format & 1<<0);
			this.drawModule(width-2, 8, format & 1<<1);
			this.drawModule(width-3, 8, format & 1<<2);
			this.drawModule(width-4, 8, format & 1<<3);
			this.drawModule(width-5, 8, format & 1<<4);
			this.drawModule(width-6, 8, format & 1<<5);
			this.drawModule(width-7, 8, format & 1<<6);
			this.drawModule(width-8, 8, format & 1<<7);
			this.drawModule(7, 8, format & 1<<8);
			this.drawModule(5, 8, format & 1<<9);
			this.drawModule(4, 8, format & 1<<10);
			this.drawModule(3, 8, format & 1<<11);
			this.drawModule(2, 8, format & 1<<12);
			this.drawModule(1, 8, format & 1<<13);
			this.drawModule(0, 8, format & 1<<14);
			
			// vertical
			this.drawModule(8, 0, format & 1<<0);
			this.drawModule(8, 1, format & 1<<1);
			this.drawModule(8, 2, format & 1<<2);
			this.drawModule(8, 3, format & 1<<3);
			this.drawModule(8, 4, format & 1<<4);
			this.drawModule(8, 5, format & 1<<5);
			this.drawModule(8, 7, format & 1<<6);
			this.drawModule(8, 8, format & 1<<7);
			this.drawModule(8, width-7, format & 1<<8);
			this.drawModule(8, width-6, format & 1<<9);
			this.drawModule(8, width-5, format & 1<<10);
			this.drawModule(8, width-4, format & 1<<11);
			this.drawModule(8, width-3, format & 1<<12);
			this.drawModule(8, width-2, format & 1<<13);
			this.drawModule(8, width-1, format & 1<<14);
			
			this.drawModule(8, width-8, true);
		},
		
		drawVersion: function() {
			// version info is only used in QR versions 7+
			if (this.version.number < 7) {
				return;
			}
			
			var ver = this.version.getData();
			var width = this.getWidth();
			for (var i = 0; i < 6; i++) {
				for (var j = 0; j < 3; j++) {
					this.drawModule(i, width-11+j, ver & 1 << (3*i+j));
					this.drawModule(width-11+j, i, ver & 1 << (3*i+j));
				}
			}
		},
		
		createAndFillBlocks: function() {
			this.myQRDataEncoder.createDataCodewords();
			this.myQRDataEncoder.createErrorCodewords();
			this.addDataBlocks(this.myQRDataEncoder.dataCodewordsInt);
			this.addDataBlocks(this.myQRDataEncoder.errorCodewordsInt);
			MatrixBarcode.fillRemainder();
		},
		
		displayQR: function(ECLevel, version, mask) {
			// set specified EC level
			this.setECLevel(ECLevel);
			
			// init grid
			this.initGrid(version);
			
			// fill grid
			this.createAndFillBlocks();
			
			// mask grid
			this.maskGrid(mask);

			// display grid
			MatrixBarcode.displayGrid();
		}
	}
	
	GF256Poly.init(285);
	
	return { QRCreator: QRCreator, QRDataEncoder: QRDataEncoder };
});