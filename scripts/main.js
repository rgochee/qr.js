require(['./qr/qr', './qr/qr_UnitTests'], function (QR, qr_UnitTests) {

	// now let's start to draw!
	
	// STEP 0: set up your drawing area (needs to be done only once)
	QR.QRCreator.setupCanvas(document.getElementById("QR"));
	//QRCreator.setupCanvas(document.getElementById("QR"), 3);

	// STEP 1: set up the text and specify text mode/encoding
	QR.QRCreator.addText("HELLO WORLD", QR.QRDataEncoder.TEXTMODE_ALNUM);
	QR.QRCreator.addText("123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789", QR.QRDataEncoder.TEXTMODE_ALNUM);
	// STEP 2: Make it visible!
	//   displayQR has 3 parameters, the latter two are optional.
	//     -EClevel       - error correction level
	//     -version [opt] - Version (size). if unspecified or 0, the QR generator will choose the minimum version required for the given text
	//     -mask    [opt] - QR mask. if unspecified, the QR generator will choose a suitable mask
	QR.QRCreator.displayQR(0);
	//QRCreator.displayQR(3, 30);

	// Optional steps:
	// One can use QRCreator.reset() and go back to step 1 to create other QR codes.
	// Step 0 only needs to be done to change the canvas.


	// NOTE: below is the fun stuff for making timestamp QR codes.
	testmask = 0;
	function test()
	{
		QR.QRCreator.reset();
		QR.QRCreator.addText((new Date()).toString(), QR.QRDataEncoder.TEXTMODE_BYTE);
		QR.QRCreator.displayQR(0, 0, testmask%8);
		testmask++;
	}
	function setButtonTest() {
		document.getElementById('test').onclick = function() { test(); setInterval(test,250) };
	}
	// set timeout so DOM can load
	//setTimeout( function() { setButtonTest() }, 1000 );
	setButtonTest();

	// Unit tests are run here!
	qr_UnitTests.RunAllUnitTests();

});