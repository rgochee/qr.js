define(function (require) {
	var utils = require('../../lib/externalUtils');
	var BinMath = require('../../math/binmath');
	var GF256Poly = require('../../math/GF256/GF256Poly');
	var MatrixBarcode = require('../MatrixBarcode');
	
	GF256Poly.init(301);

	// singleton that acts as our data encoder
	var DataMatrixEncoder = {
		// constants
		TEXTMODE_ASCII:   1, // unsupported
		TEXTMODE_C40:     2, // unsupported
		TEXTMODE_TEXT:    4, // unsupported
		TEXTMODE_X12:     8, // unsupported
		TEXTMODE_EDIFACT: 3, // unsupported
		TEXTMODE_BASE256: 7, // unsupported
		TEXTMODE_EOM:     0,
		
		// local vars
		text: "",
		textmode: this.TEXTMODE_EOM, // NOTE: mixed modes are unsupported, but it shouldn't be _too_ hard to code.
									 // the interface could change to: SetText()/AppendText() with this.text[{text,mode}, ...]
									 // likewise, a bunch of helper functions should be fixed, like getMinimumVersionRequired(), encodeBits(), etc.
		data: null,
		dataLength: 0,
		dataBits: null,
		dataCodewords: null,
		size: 10,
		
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
		
		// Returns the number of required data codewords for the specified QR code version+level
		getSymbolInfo: function(width, height) {
			if (typeof(height) == 'undefined')
			{
				height = width;
			}
			if (typeof(width) == 'undefined')
			{
				width = this.getWidth();
				height = this.getHeight();
			}
			
			// width, height, data codewords, error codewords, reed-solomon blocks
			var symbolInfo = [[10,10,3,5,1]
							 ,[12,12,5,7,1]
							 ,[14,14,8,10,1]
							 ,[16,16,12,12,1]
							 ,[18,18,18,14,1]
							 ,[20,20,22,18,1]
							 ,[22,22,30,20,1]
							 ,[24,24,36,24,1]
							 ,[26,26,44,28,1]
							 ,[32,32,62,36,1]
							 ,[36,36,86,42,1]
							 ,[40,40,114,48,1]
							 ,[44,44,144,56,1]
							 ,[48,48,174,68,1]
							 ,[52,52,204,84,2]
							 ,[64,64,280,112,2]
							 ,[72,72,368,144,4]
							 ,[80,80,456,192,4]
							 ,[88,88,576,224,4]
							 ,[96,96,696,272,4]
							 ,[104,104,816,336,6]
							 ,[120,120,1050,408,6]
							 ,[132,132,1304,496,8]
							 ,[144,144,1558,62,10]
							 ,[8,18,5,7,1]
							 ,[8,32,10,11,1]
							 ,[12,26,16,14,1]
							 ,[12,36,22,18,1]
							 ,[16,36,32,24,1]
							 ,[16,48,49,28,1]];

			// look for the proper row in the table
			for (var i = 0; i < symbolInfo.length; ++i)
			{
				if (symbolInfo[i][0] == width &&
				    symbolInfo[i][1] == height)
				{
					return { dataCodewords:  symbolInfo[i][2],
							 errorCodewords: symbolInfo[i][3],
							 ecBlocks:       symbolInfo[i][4] };
				}
			}
			
			// couldn't find it -- return null
			return;
		},
		
		// Returns the number of required data codewords for the specified QR code version+level
		numDataCodewords: function(width, height) {
			var info = this.getSymbolInfo(width, height);
			
			if (!info)
			{
				return;
			}
			
			return info.dataCodewords;
		},
		
		// Returns the number of required error codewords per block for the specified QR code version+level
		numErrorCodewords: function(width, height) {
			var info = this.getSymbolInfo(width, height);
			
			if (!info)
			{
				return;
			}
			
			return info.errorCodewords;
		},
		
		// Returns the number of required error correction blocks for the specified QR code version+level
		numErrorBlocks: function(width, height) {
			var info = this.getSymbolInfo(width, height);
			
			if (!info)
			{
				return;
			}
			
			return info.ecBlocks;
		},
		
		numDataBlocks: function(width, height) {
			var info = this.getSymbolInfo(width, height);
			
			if (!info)
			{
				return;
			}
			
			var numDataCodewordsGroup1 = Math.floor(info.dataCodewords / info.ecBlocks);
			var numDataCodewordsGroup2 = numDataCodewordsGroup1 + 1;
			
			var numBlocksGroup2 = info.dataCodewords % info.ecBlocks;
			var numBlocksGroup1 = info.ecBlocks - numBlocksGroup2;
			
			if (numBlocksGroup2 == 0)
			{
				//numDataCodewordsGroup2 = 0;
				return [[numBlocksGroup1, numDataCodewordsGroup1]];
			}
			
			return [[numBlocksGroup1, numDataCodewordsGroup1], [numBlocksGroup2, numDataCodewordsGroup2]];
		},
		
		// Calculates minimum version requried given text encoding and error correction level
		getMinimumSizeRequired: function() {
			// TODO: not this.
			return 10;
			
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
				this.ECGenerator.multiply(new GF256Poly([GF256.exp(i), 1]));
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

	var DataMatrixCreator = {
		// local vars
		blockPos: null,
		blockDir: null,
		
		// possible sizes
		// square
		// 10-26: 2
		// 26-52: 4
		// 64-104: 8
		// 120-144: 12
		// rectangle
		// row: 8-16:4
		// col: !?
		size: {
			width: 0,
			height: 0,
			isSquare: function() {
				return this.width == this.height;
			},
			getDataRegionInfo: function() {
				var row = this.width;
				var col = this.height;
				var numRegions = 1;
				if (row >= 120) {
					row /= 6;
					numRegions *= 6;
				}
				if (col >= 120) {
					col /= 6;
					numRegions *= 6;
				}
				if (row >= 64) {
					row /= 4;
					numRegions *= 4;
				}
				if (col >= 64) {
					col /= 4;
					numRegions *= 4;
				}
				if (row >= 32) {
					row /= 2;
					numRegions *= 2;
				}
				if (col >= 32) {
					col /= 2;
					numRegions *= 2;
				}
				return {w: row,
				        h: col,
				        numRegions: numRegions};
			}
		},
		
		myDataMatrixEncoder: DataMatrixEncoder,
		
		// Modify data
		setText: function(text, textmode) {
			if (!textmode)
			{
				textmode = this.myDataMatrixEncoder.TEXTMODE_BYTE;
			}
			this.myDataMatrixEncoder.text = text;
			this.myDataMatrixEncoder.textmode = textmode;
		},

		reset: function() {
			this.addText('', 0);
			this.setVersion(1);
			MatrixBarcode.resetCanvas();
			this.blockPos = null;
			this.blockDir = null;
		},
		
		//
		// helper functions
		//
		
		setSize: function(width, height) {
			if (!height) {
				height = width;
			}
			if (!width) {
				width = this.myDataMatrixEncoder.getMinimumSizeRequired();
				height = width;
			}
			
			// Check if it's a valid symbol
			if (!this.myDataMatrixEncoder.getSymbolInfo(width,height)) {
				return false;
			}
			
			// Now set it
			this.size.width = width;
			this.size.height = height;
			
			return true;
		},
		
		getWidth: function() {
			return this.size.width;
		},
		getHeight: function() {
			return this.size.height;
		},
		getX: function(x) {
			if (x < 0 || x > this.getWidth()) {
				return null;
			}
			return x+1;
		},
		getY: function(y) {
			if (y < 0 || y > this.getHeight()) {
				return null;
			}
			return y+1;
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
		drawLine: function(x, y, len, dir, fill) {
			MatrixBarcode.drawLine(this.getX(x), this.getY(y), len, dir, fill);
		},
		drawAlternating: function(x, y, len, dir) {
			MatrixBarcode.drawAlternating(this.getX(x), this.getY(y), len, dir);
		},
		
		// adding data
		
		addUtah: function(block) {
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
				this.addUtah(dataCodewords[i]);
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
		drawAlignmentBox: function(x, y, width, height) {
			this.drawLine(x, y, height-1, 'd', true);
			this.drawLine(x, y+height-1, width, 'r', true);
			this.drawAlternating(x, y, width, 'r');
			this.drawAlternating(x+width-1, y+1, height-2, 'd');
		},
		
		drawFinder: function() {
			this.drawAlignmentBox(0, 0, this.getWidth(), this.getHeight());	
		},
		
		drawAlignments: function() {
			var blockSize = this.size.getDataRegionInfo();
			var blockRows = Math.floor(this.getHeight()/blockSize.h);
			var blockCols = Math.floor(this.getWidth()/blockSize.w);
			for (var i = 0; i < blockRows; ++i) {
				for (var j = 0; j < blockCols; ++j) {
					this.drawAlignmentBox(blockSize.w*j, blockSize.h*i, blockSize.w, blockSize.h);
				}
			}
		},
		
		clearQuietZone: function() {
			MatrixBarcode.drawLine(0, 0, this.getHeight()+2, 'd', false);
			MatrixBarcode.drawLine(0, 0, this.getWidth()+2, 'r', false);
			MatrixBarcode.drawLine(0, this.getHeight()+1, this.getWidth()+2, 'r', false);
			MatrixBarcode.drawLine(this.getWidth()+1, 0, this.getHeight()+2, 'd', false);
		},
		
		// main functions
		setupCanvas: function(canvas, size) {
			MatrixBarcode.setupCanvas(canvas, size);
		},
		
		reset: function() {
			MatrixBarcode.resetGrid();
		},

		initGrid: function() {
			MatrixBarcode.initGrid(this.getWidth()+2, this.getHeight()+2);
			
			this.blockPos = {X:this.getWidth()-2,
			                 Y:this.getWidth()-1};
			this.blockDir = 0;
			
			this.initStructure();
		},
		
		initStructure: function() {
			// position detection patterns
			this.drawFinder();
			
			// alignment patterns
			this.drawAlignments();
			
			// quiet zone
			this.clearQuietZone();
		},
		
		createAndFillBlocks: function() {
			this.myDataMatrixEncoder.createDataCodewords();
			this.myDataMatrixEncoder.createErrorCodewords();
			this.addDataBlocks(this.myDataMatrixEncoder.dataCodewordsInt);
			this.addDataBlocks(this.myDataMatrixEncoder.errorCodewordsInt);
			MatrixBarcode.fillRemainder();
		},
		
		displayBarcode: function(width, height) {
			// set size
			this.setSize(width, height);
			
			// init grid (create grid and set up structure)
			this.initGrid();
			
			// fill grid with data
			//this.createAndFillBlocks();

			// display grid
			MatrixBarcode.displayGrid();
		}
	}
	
	return { DataMatrixCreator: DataMatrixCreator, DataMatrixEncoder: DataMatrixEncoder };
});