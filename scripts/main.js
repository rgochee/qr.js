require(['./barcodes/QR/QR', './barcodes/QR/QR_UnitTests'], function (QR, QR_UnitTests) {

	// STEP 0: set up your drawing area (needs to be done only once)
	//   setupCanvas takes 2 paramters, the 2nd being optional.
	//     -canvas        - HTML canvas element to draw on
	//     -size    [opt] - The size of each QR pixel in screen pixels - defaults to 6
	QR.QRCreator.setupCanvas(document.getElementById("QR"));
	//QRCreator.setupCanvas(document.getElementById("QR"), 3);

	// STEP 1: set up the text and specify text mode/encoding
	//   setText takes 2 paramters, the 2nd being optional.
	//     -text           - Text you wish to encode
	//     -textmode [opt] - Textmode you wish to encode in. Defaults to QR.QRDataEncoder.TEXTMODE_BYTE. Note that this may be space-inefficient
	//QR.QRCreator.setText("HELLO WORLD", QR.QRDataEncoder.TEXTMODE_ALNUM);
	QR.QRCreator.setText("123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789", QR.QRDataEncoder.TEXTMODE_ALNUM);
	
	// STEP 2: Make it visible!
	//   displayQR has 3 parameters, the latter two are optional.
	//     -EClevel        - error correction level, QR.QRDataEncoder.ECLEVEL_*
	//     -version  [opt] - Version (size). if unspecified or 0, the QR generator will choose the minimum version required for the given text
	//     -mask     [opt] - QR mask. if unspecified, the QR generator will choose a suitable mask. Mask is a value 0-7.
	QR.QRCreator.displayQR(QR.QRDataEncoder.ECLEVEL_L);
	//QRCreator.displayQR(QR.QRDataEncoder.ECLEVEL_H, 30);

	// Optional steps:
	// One can use QRCreator.reset() and go back to step 1 to create other QR codes.
	// Step 0 only needs to be done to change the canvas.


	// NOTE: below is the fun stuff for making timestamp QR codes.
	testmask = 0;
	function test()
	{
		QR.QRCreator.reset();
		QR.QRCreator.setText((new Date()).toString(), QR.QRDataEncoder.TEXTMODE_BYTE);
		QR.QRCreator.displayQR(QR.QRDataEncoder.ECLEVEL_L, 0, testmask%8);
		testmask++;
	}
	function setButtonTest() {
		document.getElementById('test').onclick = function() { test(); setInterval(test,250) };
	}
	setButtonTest();

	// Unit tests are run here!
	QR_UnitTests.RunAllUnitTests();

});