define(function (require) {
	var MatrixBarcode = {
		// local vars
		canvas: null,
		size: 6, // pixel width of each block
		
		grid: null,
		width: 0,
		height: 0,
		blockPos: null,
		blockDir: null,
		
		resetGrid: function() {
			this.resetCanvas();
			this.grid = null;
		},
		
		//
		// helper functions
		//
		
		getWidth: function() {
			return this.width;
		},
		getHeight: function() {
			return this.height;
		},
		
		//
		// drawing functions
		//
		
		// Gets the value of a module in the grid
		getModule: function(x,y) {
			return this.grid[x][y];
		},
		
		// Colors in a module in the grid
		colorModule: function(x,y) {
			//this.canvas.getContext("2d").fillRect(x*this.size, y*this.size, this.size, this.size);
			this.grid[x][y] = 1;
		},
		// Erases a module from the grid
		eraseModule: function(x,y) {
			//this.canvas.getContext("2d").clearRect(x*this.size, y*this.size, this.size, this.size);
			this.grid[x][y] = 0;
		},
		// Inverts a module from the grid
		invertModule: function(x,y) {
			if (!this.grid[x][y]) {
				this.colorModule(x,y);
			} else {
				this.eraseModule(x,y);
			}
		},
		// Uninitializes a module from the grid
		removeModule: function(x,y) {
			//this.canvas.getContext("2d").clearRect(x*this.size, y*this.size, this.size, this.size);
			this.grid[x][y] = null;
		},
		// Colors or erases a module in the grid according to fill (1/0)
		drawModule: function(x,y, fill) {
			if (fill) {
				this.colorModule(x,y);
			} else {
				this.eraseModule(x,y);
			}
		},
		// Colors or erases a rectangle with top corner at (x, y), and bottom corner at (x+width-1, y+height-1)
		drawRect: function(x, y, width, height, fill) {
			for (var i = 0; i < width; ++i) {
				for (var j = 0; j < height; ++j) {
					if (fill) {
						this.colorModule(x+i, y+j);
					} else {
						this.eraseModule(x+i, y+j);
					}
				}
			}
		},
		// Colors or erases a square with specified size in the grid with top left corner at (x,y)
		drawSquare: function(x, y, size, fill) {
			this.drawRect(x, y, size, size, fill);
		},
		// draws a line of solid color with specified length starting at (x,y) and moving in the specified direction
		//   dir: 'r': right (or 'h': horizontal) and 'd': down (or 'v': vertical)
		drawLine: function(x, y, len, dir, fill) {
			for (var i = 0; i < len; ++i) {	
				if (dir == 'r' || dir == 'h') {
					this.drawModule(x+i, y, fill);
				}
				else if (dir == 'd' || dir == 'v') {
					this.drawModule(x, y+i, fill);
				}
			}
		},
		// draws a line of alternating modules with specified length starting at (x,y) and moving in the specified direction
		//   dir: 'r': right (or 'h': horizontal) and 'd': down (or 'v': vertical)
		drawAlternating: function(x, y, len, dir) {
			for (var i = 0; i < len; ++i) {	
				if (dir == 'r' || dir == 'h') {
					if (i % 2 == 0) {
						this.colorModule(x+i, y);
					} else {
						this.eraseModule(x+i, y);
					}
				}
				else if (dir == 'd' || dir == 'v') {
					if (i % 2 == 0) {
						this.colorModule(x, y+i);
					} else {
						this.eraseModule(x, y+i);
					}
				}
			}
		},
		
		// fills in the rest of the grid with 0s. This is necessary for version QR versions.
		fillRemainder: function() {
			for (var i = 0; i < this.getWidth(); ++i) {
				for (var j = 0; j < this.getHeight(); ++j) {
					if (this.getModule(i,j) == null) {
						this.eraseModule(i,j);
					}
				}
			}
		},
		
		// main functions
		setupCanvas: function(canvas, size) {
			this.canvas = canvas;
			
			if (size)
			{
				this.size = size;
			}
			this.resetCanvas();
		},
		
		resetCanvas: function() {
			var ctx = this.canvas.getContext("2d");
			
			// let's gray it out to start, so we see what's not done yet
			ctx.fillStyle="#999999";
			ctx.fillRect(0,0,300,300); // arbitrary size
			
			// draw the rest in black
			ctx.fillStyle="#000000";
		},

		initGrid: function(width, height) {
			// parameter checking
			if (!width || width <= 0 || height < 0)
			{
				return false;
			}
			
			// default parameter for height (makes a square)
			if (!height)
			{
				height = width;
			}
			
			this.width = width;
			this.height = height;
			
			this.grid = Array(this.getHeight());
			for (var j = 0; j < this.grid.length; ++j) {
				this.grid[j] = Array(this.getWidth());
			}
		},
		
		displayGrid: function() {
			var ctx = this.canvas.getContext("2d");
			for (var i = 0; i < this.getWidth(); ++i) {
				for (var j = 0; j < this.getHeight(); ++j) {
					if (this.getModule(i,j) == 1) {
						ctx.fillRect(i*this.size, j*this.size, this.size, this.size);
					} else if (this.getModule(i,j) == 0) {
						ctx.clearRect(i*this.size, j*this.size, this.size, this.size);
					}
				}
			}
		}
	}
	
	return MatrixBarcode;
});