/**
 * Static class
 * Started from: http://www.html5rocks.com/en/tutorials/canvas/imagefilters/
 */
function Filters() {

}

Filters.mt = new MersenneTwister();

Filters.kernels = {
    sharpen: [  0, -1,  0, -1,  5, -1, 0, -1,  0 ],
    blur: [ 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9 ],
    verticalGradient: [-1,-2,-1, 0, 0, 0, 1, 2, 1],
    horizontalGradient: [-1,0,1, -2,0,2, -1,0,1]
};

Filters.tmpCanvas = document.createElement('canvas');
Filters.tmpCtx = Filters.tmpCanvas.getContext('2d');
Filters.createImageData = function(w,h) {
  return this.tmpCtx.createImageData(w,h);
};

Filters.sharpen = function(pixels, param1) {
    return Filters.filterImage(Filters.convolute, pixels, Filters.kernels.sharpen, param1);
};

Filters.blur = function(pixels, param1) {
    return Filters.filterImage(Filters.convolute, pixels, Filters.kernels.blur, param1);
};

Filters.copyBuffer = function(pixels1, pixels2, width, height) {
  var length = width*height*4;
  for (var i=0;i<length;i++) {
    pixels2.data[i] = pixels1.data[i];
  }
}

Filters.filterImage = function(filter, pixels, var_args) {
  var args = [pixels];
  for (var i=2; i<arguments.length; i++) {
    args.push(arguments[i]);
  }
  return filter.apply(null, args);
};

/**
 * Random number in [-1,1]
 */
Filters.rand11 = function() {
  return Filters.mt.genrand_real1()*2.0-1.0;
};


  // remap from [a, b] to [a2, b2]
Filters.remap = function(value, a, b, a2, b2) {
  var t = (value - a) / (b - a);
  return a2 + t * (b2 - a2);
}

Filters.lerp = function (t, a, b) {
  return a + t * (b-a);
}

Filters.noise = function(pixels, param1) {
  var magnitude = Filters.remap(param1, 0, 100, 0, 50);
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    d[i] += Math.floor(Filters.rand11()*magnitude);
    d[i+1] += Math.floor(Filters.rand11()*magnitude);
    d[i+2] += Math.floor(Filters.rand11()*magnitude);
  }
  return pixels;
};

Filters.grayscale = function(pixels, param1) {
  var t = Filters.remap(param1, 0, 100, 0, 1);
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    // CIE luminance for the RGB
    // The human eye is bad at seeing red and blue, so we de-emphasize them.
    var v = 0.2126*r + 0.7152*g + 0.0722*b;
    d[i]   = Filters.lerp(t, r, v);
    d[i+1] = Filters.lerp(t, g, v);
    d[i+2] = Filters.lerp(t, b, v);
  }
  return pixels;
};

Filters.brightness = function(pixels, param1) {
  var t = Filters.remap(param1, 0, 100, -50, 100);
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    d[i] += t;
    d[i+1] += t;
    d[i+2] += t;
  }
  return pixels;
};

Filters.threshold = function(pixels, param1) {
  var t = Filters.remap(param1, 0, 100, 0, 255);
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    var v = (0.2126*r + 0.7152*g + 0.0722*b >= t) ? 255 : 0;
    d[i] = d[i+1] = d[i+2] = v
  }
  return pixels;
};


Filters.convolute = function(pixels, weights, param1) {
  var t = Filters.remap(param1, 0, 100, 0, 1);
  var opaque = false;
  var side = Math.round(Math.sqrt(weights.length));
  var halfSide = Math.floor(side/2);
  var src = pixels.data;
  var sw = pixels.width;
  var sh = pixels.height;
  // pad output by the convolution matrix
  var w = sw;
  var h = sh;
  var output = Filters.createImageData(w, h);
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
      dst[dstOff  ] = Filters.lerp(t, src[dstOff  ], r);
      dst[dstOff+1] = Filters.lerp(t, src[dstOff+1], g);
      dst[dstOff+2] = Filters.lerp(t, src[dstOff+2], b);
      dst[dstOff+3] = a + alphaFac*(255-a);
    }
  }
  return output;
};

Filters.convoluteFloat32 = function(pixels, weights, opaque) {
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

Filters.sobel = function(pixels) {
    var pixels = Filters.filterImage(Filters.grayscale, pixels, 100);
    var vertical = Filters.convoluteFloat32(pixels, Filters.kernels.verticalGradient);
    var horizontal = Filters.convoluteFloat32(pixels, Filters.kernels.horizontalGradient);
    var id = Filters.createImageData(vertical.width, vertical.height);
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
