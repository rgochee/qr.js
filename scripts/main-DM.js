require(['./barcodes/DataMatrix/DataMatrix'/*, './barcode/DataMatrix/DataMatrix_UnitTests' */], function (DM/*, DM_UnitTests*/) {

	// STEP 0: set up your drawing area (needs to be done only once)
	//   setupCanvas takes 2 paramters, the 2nd being optional.
	//     -canvas        - HTML canvas element to draw on
	//     -size    [opt] - The size of each barcode pixel in screen pixels - defaults to 6
	DM.DataMatrixCreator.setupCanvas(document.getElementById("QR"));
	//DataMatrixCreator.setupCanvas(document.getElementById("QR"), 3);

	// STEP 1: set up the text and specify text mode/encoding
	//   setText takes 2 paramters, the 2nd being optional.
	//     -text           - Text you wish to encode
	//     -textmode [opt] - Textmode you wish to encode in. Defaults to DM.DataMatrixEncoder.TEXTMODE_BYTE. Note that this may be space-inefficient
	//DM.DataMatrixCreator.setText("HELLO WORLD", DM.DataMatrixEncoder.TEXTMODE_ALNUM);
	DM.DataMatrixCreator.setText("123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789", DM.DataMatrixEncoder.TEXTMODE_ALNUM);
	
	// STEP 2: Make it visible!
	//   displayBarcode has 3 parameters, the latter two are optional.
	//     -width   [opt] - Width (size). if unspecified or 0, the DataMatrix generator will choose the minimum (square) size required for the given text
	//     -height  [opt] - Height (size). if unspecified or 0, the DataMatrix generator will default to the width (i.e. square barcode)
	DM.DataMatrixCreator.displayBarcode();
	//DM.DataMatrixCreator.displayBarcode(12,36);

	// Optional steps:
	// One can use DataMatrixCreator.reset() and go back to step 1 to create other DataMatrix codes.
	// Step 0 only needs to be re-done to change the canvas.

	// NOTE: below is the fun stuff for making timestamp DataMatrix codes.
	testmask = 0;
	function test()
	{
		DM.DataMatrixCreator.reset();
		DM.DataMatrixCreator.setText((new Date()).toString(), DM.DataMatrixEncoder.TEXTMODE_BYTE);
		DM.DataMatrixCreator.displayBarcode();
		testmask++;
	}
	function setButtonTest() {
		document.getElementById('test').onclick = function() { test(); setInterval(test,500) };
	}
	setButtonTest();

	// Unit tests are run here!
	//DM_UnitTests.RunAllUnitTests();

});