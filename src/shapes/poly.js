var SuperShape = require('../superShape');

/**
 * Polygon Shaped Annotation
 * @constructor
 * @extends {SuperShape}
 */
function PolyAnn() {
  SuperShape.call(this);
  this.type = 'poly';
}

PolyAnn.prototype = Object.create(SuperShape.prototype);
PolyAnn.fn = PolyAnn.prototype;

/*jshint unused:vars*/

/**
 * Adds a point to the polygon - each point is notionally 'connected' in turn to the next, looping back around to the first.
 * @param {Object} pt
 * @return {Boolean} Always true (A Polygon is never 'complete')
 * @memberOf PolyAnn#
 * @method   addPt
 */
PolyAnn.fn.addPt = function(pt) {
  if (this.pts.length === 0) {
    this.pts = [pt, pt];
  }
  else {
    this.pts.push(pt);
  }

  this.valid = true;
  return true;
};

/**
 * Inserts a point after the given index.
 * @param  {Number} ind
 * @param  {Object} pt
 * @memberOf PolyAnn#
 * @method   insPt
 */
PolyAnn.fn.insPt = function(ind, pt) {
  if (ind < 0 || ind > this.pts.length) {
    return;
  }

  this.pts.splice(ind, 0, pt);
};

/**
 * Whether or not a point can be inserted into the polygon.
 * Overrides {@link SuperTool} definition - since the polygon has an arbitray number of points, this always returns true.
 * @return {Boolean} Always true
 * @memberOf PolyAnn#
 * @method   canInsPt
 */
PolyAnn.fn.canInsPt = function() {
  return true;
};

/**
 * Modifies the last point added to match the input.
 * @param  {Object} pt
 * @memberOf PolyAnn#
 * @method   modLastPt
 */
PolyAnn.fn.modLastPt = function(pt) {
  if (this.pts.length > 0) {
    this.pts[this.pts.length-1] = pt;
  }
};

/**
 * Modifies the point at the given index to match the input.
 * @param  {Number} ind
 * @param  {Object} pt
 * @memberOf PolyAnn#
 * @method   modPt
 */
PolyAnn.fn.modPt = function(ind, pt) {
  if (ind >= 0 && ind < this.pts.length) {
    this.pts[ind] = pt;
  }
};

/**
 * Gets an array of points to draw - called by the {@link CanvasHelper}.
 * For the polygon, this just returns the stored points with a repeat of the first point appended, in order to create the desired loop.
 * @return {Array} Array of points to draw
 * @memberOf PolyAnn#
 * @method   getDrawPts
 */
PolyAnn.fn.getDrawPts = function() {
  return this.pts.concat([this.pts[0]]);
};

/**
 * Deletes the point at the given index.
 * @param  {Number} ind
 * @memberOf PolyAnn#
 * @method   delPt
 */
PolyAnn.fn.delPt = function(ind) {
  this.pts.splice(ind, 1);

  if (this.pts.length < 2) {
    this.invalidate();
    this.pts = [];
  }
};

/**
 * Gets the export data for the annotation.
 * For the polygon, this just returns export data with the internally stored points.
 * @return {Object} Data for export to client application
 * @memberOf PolyAnn#
 * @method   getExport
 */
PolyAnn.fn.getExport = function() {
  var res = {};

  res.type = 'poly';
  res.points = this.pts;

  return res;
};

/*jshint unused:true*/

module.exports = PolyAnn;