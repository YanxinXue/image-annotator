/**
 * Manages the Annotator's canvas, passing user input to the tools and performing all rendering functionality.
 * @param {Annotator} parent The Annotator using this helper instance.
 * @constructor
 */
function CanvasHelper(parent) {
  this.parent = parent;
  var w = parent.w;
  var h = parent.h;

  /** @type {Canvas} The HTML canvas object */
  this.canvas = parent.canvas;
  /** @type {GraphicsContext} The canvas' attached graphics context, used for drawing  */
  this.g = this.canvas[0].getContext("2d");

  // Dim
  this.canvas[0].width = w;
  this.canvas[0].height = h;
  this.w = w;
  this.h = h;
  this.imgW = w;
  this.imgH = h;

  /** @type {Number} The default scaling level for the current image (see {@link CanvasHelper#calcZoom}) */
  this.defScale = 1.0;
  /** @type {Number} The current scaling level */
  this.curScale = this.defScale;
  /** @type {Number} The current x offset (pan) */
  this.xOffs = 0;
  /** @type {Number} The current y offset (pan) */
  this.yOffs = 0;

  /** @type {SuperShape} Annotation to highlight independently of the currently selected annotation */
  this.hlt = null;
  this.select = [];
}

CanvasHelper.fn = CanvasHelper.prototype;

/**
 * Re-draws the canvas - updates the view of the image and its annotations.
 * @memberOf CanvasHelper#
 * @method   repaint
 */
CanvasHelper.fn.repaint = function() {
  var g = this.g;
  var ftrs = this.parent.getFeatures();

  // Reset xform & clear
  g.setTransform(1,0,0,1,0,0);
  g.fillStyle = "rgb(240, 240, 240)";
  g.fillRect(0, 0, this.w, this.h);

  // To draw in position with scaling,
  // move to position (translate), then
  // scale before drawing at (0, 0)
  g.translate(this.w/2 + this.xOffs, this.h/2 + this.yOffs);
  g.scale(this.curScale, this.curScale);

  // Drop shadow
  g.shadowColor = "#555";
  g.shadowBlur = 20;

  // Draw the image
  if (this.parent.img !== null) {
    g.drawImage(this.parent.img[0], -this.imgW/2, -this.imgH/2);
  }
  else {
    g.fillStyle = "rgb(220, 220, 220)";
    g.fillRect(-this.imgW/2, -this.imgH/2, this.imgW, this.imgH);

    g.shadowBlur = 0;
    g.fillStyle = "white";
    g.font = "22px sans-serif";
    g.fillText("No Image", -40, -8);
  }

  // Annotation
  for (var f = 0; f < ftrs.length; f++) {
    var ftr = ftrs[f];
    for (var i = 0; i < ftr.anns.length; i++) {
      this.drawAnn(ftr.anns[i], f);
    }
  }

  // Tools
  if (this.parent.curTool) {
    this.parent.curTool.draw(g);
  }
};

/**
 * Draws an annotation to the canvas.
 * @param  {SuperShape} ann Annotation to draw.
 * @param  {Number} fInd The index of the feature the annotation belongs to.
 * @memberOf CanvasHelper#
 * @method   drawAnn
 */
CanvasHelper.fn.drawAnn = function(ann, fInd) {
  var g = this.g;

  var cols =
  [
    ["rgb(255, 20, 20)","rgb(255, 80, 80)"],
    ["rgb(0, 200, 0)","rgb(80, 240, 80)"],
    ["rgb(0, 0, 255)","rgb(80, 80, 255)"],
    ["rgb(255, 255, 0)","rgb(255, 255, 90)"],
    ["rgb(50, 200, 200)","rgb(90, 255, 255)"]
  ];

  if (!ann.valid) {
    return;
  }

  var col = cols[fInd % cols.length];
  var fillCol = col[0];
  var cInd = 0;
  var drawPts = false;

  if (ann === this.hlt || this.parent.annHelper.getAnn() === ann) {
    cInd = 1;
    fillCol = col[1];
    drawPts = true;
  }

  // Make sure to always draw point annontations.
  if (ann.type === 'point' || this.parent.annHelper.getAnn() === 'point') {
    cInd = 1;
    fillCol = col[1];
    drawPts = true;
  }

  g.shadowColor = "#FFF";
  g.shadowBlur = 0;
  g.fillStyle = fillCol;

  // Shape drawing (n-point)
  var pts = ann.getDrawPts();
  
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);

  for (var i = 1; i < pts.length; i++) {
    g.lineTo(pts[i].x, pts[i].y);
  }

  g.strokeStyle = col[cInd];
  g.lineWidth = 1.5 / this.curScale;
  g.stroke();

  if (drawPts) {
    for (i = 0; i < pts.length; i++) {
      this.drawPt(pts[i]);
    }
  }
};

/**
 * Draws a point as a small circle to the canvas.
 * @param  {Object} pt
 * @memberOf CanvasHelper#
 * @method   drawPt
 */
CanvasHelper.fn.drawPt = function(pt) {
  var g = this.g;
  g.beginPath();
  g.arc(pt.x, pt.y, 3/this.curScale, 0, 2*Math.PI, false);
  g.fill();
};

/**
 * Pans the view of the image and annotations.
 * @param  {Number} x Distance to pan horizontally
 * @param  {Number} y Distance to pan vertically
 * @memberOf CanvasHelper#
 * @method   doPan
 */
CanvasHelper.fn.doPan = function(x, y) {
  // New offset
  this.xOffs += x;
  this.yOffs += y;

  var xLim = (this.imgW/2)*this.curScale;
  var yLim = (this.imgH/2)*this.curScale;

  if (this.xOffs >  xLim) {this.xOffs =  xLim;}
  if (this.xOffs < -xLim) {this.xOffs = -xLim;}
  if (this.yOffs >  yLim) {this.yOffs =  yLim;}
  if (this.yOffs < -yLim) {this.yOffs = -yLim;}

  this.repaint();
};

/**
 * Zooms in or out of the image and annotations.
 * @param  {Number} scale Scaling factor, e.g. 2 to zoom in by 2x
 * @memberOf CanvasHelper#
 * @method   zoom
 */
CanvasHelper.fn.zoom = function(scale) {
  // New scaling level
  this.curScale *= scale;

  if (this.curScale < this.defScale) {
    this.curScale = this.defScale;
  }

  this.doPan(0, 0);
  this.repaint();
};

/**
 * Updates the canvas to new dimensions and resets the pan and zoom to their default levels.
 * @param  {Number} w New canvas width
 * @param  {Number} h New canvas height
 * @memberOf CanvasHelper#
 * @method   reset
 */
CanvasHelper.fn.reset = function(w, h) {
  this.canvas[0].width = w;
  this.canvas[0].height = h;
  this.w = w;
  this.h = h;

  if (this.parent.img) {
    var img = this.parent.img;
    this.imgW = img[0].width;
    this.imgH = img[0].height;
  }
  else {
    this.imgW = w;
    this.imgH = h;
  }

  this.xOffs = 0;
  this.yOffs = 0;

  this.calcZoom();
  this.curScale = this.defScale;
};

/**
 * Finalizes image load, registering the image's true width and height. Calls {@link CanvasHelper#calcZoom}.
 * This is called automatically when a new image finishes loading.
 * @param  {Image} img
 * @memberOf CanvasHelper#
 * @method   imgLoaded
 */
CanvasHelper.fn.imgLoaded = function(img) {
  // Grab the image dimensions. These are only available
  // once the image is fully loaded
  this.imgW = img[0].width;
  this.imgH = img[0].height;

  this.calcZoom();
  this.curScale = this.defScale;

  this.repaint();
};

/**
 * Calculates the correct default zoom level, taking into account aspect ratio to keep the image fully in view at the furthest zoom level.
 * @memberOf CanvasHelper#
 * @method   calcZoom
 */
CanvasHelper.fn.calcZoom = function() {
  // We can use the dimensions and the available canvas
  // area to work out a good zoom level
  var xRatio = this.w / this.imgW;
  var yRatio = this.h / this.imgH;
  var absRatio = Math.min(xRatio, yRatio);

  this.defScale = absRatio * 0.9;
};

/**
 * Sets the annotation which is to be highlighted.
 * @param {SuperShape} ann
 * @memberOf CanvasHelper#
 * @method   setHlt
 */
CanvasHelper.fn.setHlt = function(ann) {
  this.hlt = ann;
};

/**
 * Utility function which transforms a point from screen to image space according to the current pan and zoom settings.
 * @param  {Number} xin
 * @param  {Number} yin
 * @return {Object} Transformed point
 * @memberOf CanvasHelper#
 * @method   ptToImg
 */
CanvasHelper.fn.ptToImg = function(xin, yin) {
  var offset = this.canvas.offset();
  xin -= offset.left;
  yin -= offset.top;

  var a = this;
  var x = (xin-a.w/2-a.xOffs)/a.curScale;
  var y = (yin-a.h/2-a.yOffs)/a.curScale;

  if (x < -a.imgW/2) {x = -a.imgW/2;}
  if (x >  a.imgW/2) {x =  a.imgW/2;}
  if (y < -a.imgH/2) {y = -a.imgH/2;}
  if (y >  a.imgH/2) {y =  a.imgH/2;}

  var out = {x:x,y:y};

  return out;
};

/**
 * Utility function which transforms a distance from screen to image space.
 * @param  {Number} dist
 * @return {Number} Scaled distance
 * @memberOf CanvasHelper#
 * @method   scaleDist
 */
CanvasHelper.fn.scaleDist = function(dist) {
  return dist / this.curScale;
};

module.exports = CanvasHelper;