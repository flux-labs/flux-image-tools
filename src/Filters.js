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

Filters.sharpen = function(pixels, param1, mask, invert) {
    return Filters.convolute(pixels, Filters.kernels.sharpen, param1, mask, invert);
};

Filters.blur = function(pixels, param1, mask, invert) {
    return Filters.convolute(pixels, Filters.kernels.blur, param1, mask, invert);
};

Filters.copyBuffer = function(pixels1, pixels2, width, height) {
  var length = width*height*4;
  for (var i=0;i<length;i++) {
    pixels2.data[i] = pixels1.data[i];
  }
}

Filters.clonePixels = function (pixels) {
  var pixels2 = Filters.createImageData(pixels.width, pixels.height);
  Filters.copyBuffer(pixels, pixels2, pixels.width, pixels.height);
  return pixels2;
}
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

Filters.noise = function(pixels, param1, mask, invert) {
  var magnitude = Filters.remap(param1, 0, 100, 0, 50);
  var md = Filters.grayscaleHelper(pixels).data;
  var p = pixels.data;
  var pixels2 = Filters.clonePixels(pixels);
  var d = pixels2.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    d[i] += Math.floor(Filters.rand11()*magnitude);
    d[i+1] += Math.floor(Filters.rand11()*magnitude);
    d[i+2] += Math.floor(Filters.rand11()*magnitude);
  }
  return Filters.maskResult(pixels, pixels2, md, mask, invert);
};

Filters.grayscaleHelper = function(pixels, param1) {
  var output = Filters.createImageData(pixels.width, pixels.height);
  var t = Filters.remap(param1, 0, 100, 0, 1);
  var p = pixels.data;
  var d = output.data;
  for (var i=0; i<d.length; i+=4) {
    var r = p[i];
    var g = p[i+1];
    var b = p[i+2];
    // CIE luminance for the RGB
    // The human eye is bad at seeing red and blue, so we de-emphasize them.
    var v = 0.2126*r + 0.7152*g + 0.0722*b;
    d[i] = d[i+1] = d[i+2] = v;
  }
  return output;
};

Filters.grayscale = function(pixels, param1, mask, invert) {
  var md = Filters.grayscaleHelper(pixels).data;
  var t = Filters.remap(param1, 0, 100, 0, 1);
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    // CIE luminance for the RGB
    // The human eye is bad at seeing red and blue, so we de-emphasize them.
    var v = 0.2126*r + 0.7152*g + 0.0722*b;
    var brightness = md[i]/Filters.range;
    brightness = invert ? brightness : 1-brightness;
    var tm = Filters.lerp(brightness, t, mask);
    d[i]   = Filters.lerp(tm, r, v);
    d[i+1] = Filters.lerp(tm, g, v);
    d[i+2] = Filters.lerp(tm, b, v);
  }
  return pixels;
};

Filters.brightness = function(pixels, param1, mask, invert) {
  var t = Filters.remap(param1, 0, 100, -50, 100);
  var md = Filters.grayscaleHelper(pixels).data;
  var p = pixels.data;
  var pixels2 = Filters.clonePixels(pixels);
  var d = pixels2.data;
  for (var i=0; i<d.length; i+=4) {
    d[i] += t;
    d[i+1] += t;
    d[i+2] += t;
  }
  return Filters.maskResult(pixels, pixels2, md, mask, invert);
};

Filters.maskResult = function (pixels, pixels2, md, mask, invert) {
  var p = pixels.data;
  var d = pixels2.data;
  for (var i=0; i<d.length; i+=4) {
    var a = md[i]/Filters.range;
    a = invert ? a : 1-a;
    var tm = Filters.lerp(a, 1, mask);
    d[i  ] = Filters.lerp(tm, p[i  ], d[i  ]);
    d[i+1] = Filters.lerp(tm, p[i+1], d[i+1]);
    d[i+2] = Filters.lerp(tm, p[i+2], d[i+2]);
  }
  return pixels2;
}

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

// http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
Filters.mAdobe = [0.5767309,  0.1855540,  0.1881852,
          0.2973769,  0.6273491,  0.0752741,
          0.0270343,  0.0706872,  0.9911085];

Filters.mAdobeInv = [2.0413690, -0.5649464, -0.3446944,
            -0.9692660,  1.8760108,  0.0415560,
             0.0134474, -0.1183897,  1.0154096];

Filters.mBeta = [
  0.6712537,  0.1745834,  0.1183829,
  0.3032726,  0.6637861,  0.0329413,
  0.0000000,  0.0407010,  0.7845090
];

Filters.mBetaInv = [
   1.6832270, -0.4282363, -0.2360185,
  -0.7710229,  1.7065571,  0.0446900,
   0.0400013, -0.0885376,  1.2723640
];

Filters.rgbToXyz = function(data) {
  return Filters.transform(data, Filters.mBeta);
}

Filters.xyzToRgb = function(data) {
  return Filters.transform(data, Filters.mBetaInv);
}

Filters.transform = function(data, m) {
  var x = data[0] * m[0] + data[1] * m[1] + data[2] * m[2];
  var y = data[0] * m[3] + data[1] * m[4] + data[2] * m[5];
  var z = data[0] * m[6] + data[1] * m[7] + data[2] * m[8];
  return [x,y,z];
};


Filters.red = function(pixels, param1, mask, invert) {
  var t = Filters.remap(param1, 0, 100, -30, 30);
  var md = Filters.grayscaleHelper(pixels).data;
  var p = pixels.data;
  var pixels2 = Filters.clonePixels(pixels);
  var d = pixels2.data;
  for (var i=0; i<d.length; i+=4) {
    d[i] += t;
  }
  return Filters.maskResult(pixels, pixels2, md, mask, invert);
};

Filters.green = function(pixels, param1, mask, invert) {
  var t = Filters.remap(param1, 0, 100, -30, 30);
  var md = Filters.grayscaleHelper(pixels).data;
  var p = pixels.data;
  var pixels2 = Filters.clonePixels(pixels);
  var d = pixels2.data;
  for (var i=0; i<d.length; i+=4) {
    d[i+1] += t;
  }
  return Filters.maskResult(pixels, pixels2, md, mask, invert);
};

Filters.blue = function(pixels, param1, mask, invert) {
  var t = Filters.remap(param1, 0, 100, -30, 30);
  var md = Filters.grayscaleHelper(pixels).data;
  var p = pixels.data;
  var pixels2 = Filters.clonePixels(pixels);
  var d = pixels2.data;
  for (var i=0; i<d.length; i+=4) {
    d[i+2] += t;
  }
  return Filters.maskResult(pixels, pixels2, md, mask, invert);
};

Filters.temperature = function(pixels, param1, mask, invert) {
  var t = Filters.remap(param1, 0, 100, -15, 15);
  var md = Filters.grayscaleHelper(pixels).data;
  var p = pixels.data;
  var pixels2 = Filters.clonePixels(pixels);
  var d = pixels2.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    var xyz = Filters.rgbToXyz([r,g,b]);
    xyz[0] += t; // green pink
    // xyz[1] += t; // pink green
     xyz[2] -= t; // yellow blue
    var rgb = Filters.xyzToRgb(xyz);
    d[i] = rgb[0];
    d[i+1] = rgb[1];
    d[i+2] = rgb[2];
  }
  return Filters.maskResult(pixels, pixels2, md, mask, invert);
};

Filters.range = 255;

Filters.contrast = function(pixels, param1, mask, invert) {
  var t = Filters.remap(param1, 0, 100, 0, 2);
  var md = Filters.grayscaleHelper(pixels).data;
  var p = pixels.data;
  var pixels2 = Filters.clonePixels(pixels);
  var d = pixels2.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    r = ((((r / Filters.range)-0.5)*t)+0.5)*Filters.range;
    g = ((((g / Filters.range)-0.5)*t)+0.5)*Filters.range;
    b = ((((b / Filters.range)-0.5)*t)+0.5)*Filters.range;
    d[i] = r;
    d[i+1] = g;
    d[i+2] = b;
  }
  return Filters.maskResult(pixels, pixels2, md, mask, invert);
};

Filters.convolute = function(pixels, weights, param1, mask, invert) {
  var t = Filters.remap(param1, 0, 100, 0, 1);
  var md = Filters.grayscaleHelper(pixels).data;
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
  return Filters.maskResult(pixels, output, md, mask, invert);
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
    var pixels = Filters.grayscale(pixels, 100, 50);
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
