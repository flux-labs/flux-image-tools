'use strict';

/**
 * Image processing tools working on canvas pixels
 * Started from: http://www.html5rocks.com/en/tutorials/canvas/imagefilters/
 * @param {DOMElement} canvas The rendder canvas
 * @param {Number} width  Desired width
 * @param {Number} height Desired height
 */
function ImageTools (canvas, width, height){
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.canvas.width = 512;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d');
}

ImageTools.prototype.getWidth = function () {
    return this.width;
};

ImageTools.prototype.getHeight = function () {
    return this.height;
};

ImageTools.prototype.getDataUrl = function () {
    return this.canvas.toDataURL();
};

ImageTools.prototype.renderImageBlob = function (blob) {
    var _this = this;
    createImageBitmap(blob).then(function (imageBitmap) {
        _this.ctx.drawImage(imageBitmap, 0, 0, _this.width, _this.height);
    });
};

ImageTools.kernels = {
    sharpen: [  0, -1,  0, -1,  5, -1, 0, -1,  0 ],
    blur: [ 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9 ],
    verticalGradient: [-1,-2,-1, 0, 0, 0, 1, 2, 1],
    horizontalGradient: [-1,0,1, -2,0,2, -1,0,1]
};

ImageTools.tmpCanvas = document.createElement('canvas');
ImageTools.tmpCtx = ImageTools.tmpCanvas.getContext('2d');
ImageTools.createImageData = function(w,h) {
  return this.tmpCtx.createImageData(w,h);
};

ImageTools.prototype.doSomething = function () {
    console.log('image tools');
    var pixels = this.ctx.getImageData(0,0,this.width,this.height);

    pixels = ImageTools.filterImage(ImageTools.noise, pixels);
    // pixels = ImageTools.filterImage(ImageTools.grayscale, pixels);
    // pixels = ImageTools.filterImage(ImageTools.brightness, pixels, 50);
    // pixels = ImageTools.filterImage(ImageTools.threshold, pixels, 150);
    // pixels = ImageTools.filterImage(ImageTools.convolute, pixels, ImageTools.kernels.sharpen);
    // pixels = ImageTools.filterImage(ImageTools.convolute, pixels, ImageTools.kernels.blur);
    // pixels = ImageTools.filterImage(ImageTools.sobel, pixels);

    this.ctx.putImageData(pixels, 0,0);
}

ImageTools.filterImage = function(filter, pixels, var_args) {
  var args = [pixels];
  for (var i=2; i<arguments.length; i++) {
    args.push(arguments[i]);
  }
  return filter.apply(null, args);
};

ImageTools.noise = function(pixels) {
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    d[i] += Math.floor(Math.random()*50)-25;
    d[i+1] += Math.floor(Math.random()*50)-25;
    d[i+2] += Math.floor(Math.random()*50)-25;
  }
  return pixels;
};

ImageTools.grayscale = function(pixels) {
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    // CIE luminance for the RGB
    // The human eye is bad at seeing red and blue, so we de-emphasize them.
    var v = 0.2126*r + 0.7152*g + 0.0722*b;
    d[i] = d[i+1] = d[i+2] = v
  }
  return pixels;
};

ImageTools.brightness = function(pixels, adjustment) {
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    d[i] += adjustment;
    d[i+1] += adjustment;
    d[i+2] += adjustment;
  }
  return pixels;
};

ImageTools.threshold = function(pixels, threshold) {
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    var v = (0.2126*r + 0.7152*g + 0.0722*b >= threshold) ? 255 : 0;
    d[i] = d[i+1] = d[i+2] = v
  }
  return pixels;
};


ImageTools.convolute = function(pixels, weights, opaque) {
  var side = Math.round(Math.sqrt(weights.length));
  var halfSide = Math.floor(side/2);
  var src = pixels.data;
  var sw = pixels.width;
  var sh = pixels.height;
  // pad output by the convolution matrix
  var w = sw;
  var h = sh;
  var output = ImageTools.createImageData(w, h);
  var dst = output.data;
  // go through the destination image  pixels
  var alphaFac = opaque ? 1 : 0;
  for (var y=0; y<h; y++) {
    for (var x=0; x<w; x++) {
      var sy = y;
      var sx = x;
      var dstOff = (y*w+x)*4;
      // calculate the weighed sum of the source image pixels that
      // fall under the convolution matrix
      var r=0, g=0, b=0, a=0;
      for (var cy=0; cy<side; cy++) {
        for (var cx=0; cx<side; cx++) {
          var scy = sy + cy - halfSide;
          var scx = sx + cx - halfSide;
          if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
            var srcOff = (scy*sw+scx)*4;
            var wt = weights[cy*side+cx];
            r += src[srcOff] * wt;
            g += src[srcOff+1] * wt;
            b += src[srcOff+2] * wt;
            a += src[srcOff+3] * wt;
          }
        }
      }
      dst[dstOff] = r;
      dst[dstOff+1] = g;
      dst[dstOff+2] = b;
      dst[dstOff+3] = a + alphaFac*(255-a);
    }
  }
  return output;
};

ImageTools.convoluteFloat32 = function(pixels, weights, opaque) {
  var side = Math.round(Math.sqrt(weights.length));
  var halfSide = Math.floor(side/2);

  var src = pixels.data;
  var sw = pixels.width;
  var sh = pixels.height;

  var w = sw;
  var h = sh;
  var output = {
    width: w, height: h, data: new Float32Array(w*h*4)
  };
  var dst = output.data;

  var alphaFac = opaque ? 1 : 0;

  for (var y=0; y<h; y++) {
    for (var x=0; x<w; x++) {
      var sy = y;
      var sx = x;
      var dstOff = (y*w+x)*4;
      var r=0, g=0, b=0, a=0;
      for (var cy=0; cy<side; cy++) {
        for (var cx=0; cx<side; cx++) {
          var scy = Math.min(sh-1, Math.max(0, sy + cy - halfSide));
          var scx = Math.min(sw-1, Math.max(0, sx + cx - halfSide));
          var srcOff = (scy*sw+scx)*4;
          var wt = weights[cy*side+cx];
          r += src[srcOff] * wt;
          g += src[srcOff+1] * wt;
          b += src[srcOff+2] * wt;
          a += src[srcOff+3] * wt;
        }
      }
      dst[dstOff] = r;
      dst[dstOff+1] = g;
      dst[dstOff+2] = b;
      dst[dstOff+3] = a + alphaFac*(255-a);
    }
  }
  return output;
};

ImageTools.sobel = function(pixels) {
    var pixels = ImageTools.filterImage(ImageTools.grayscale, pixels);
    var vertical = ImageTools.convoluteFloat32(pixels, ImageTools.kernels.verticalGradient);
    var horizontal = ImageTools.convoluteFloat32(pixels, ImageTools.kernels.horizontalGradient);
    var id = ImageTools.createImageData(vertical.width, vertical.height);
  for (var i=0; i<id.data.length; i+=4) {
    var v = Math.abs(vertical.data[i]);
    id.data[i] = v;
    var h = Math.abs(horizontal.data[i]);
    id.data[i+1] = h
    id.data[i+2] = (v+h)/4;
    id.data[i+3] = 255;
  }
  return id;
};
