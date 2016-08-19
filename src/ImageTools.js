'use strict';

/**
 * Image processing tools working on canvas pixels
 * @param {DOMElement} canvas The rendder canvas
 * @param {Number} width  Desired width
 * @param {Number} height Desired height
 */
function ImageTools (canvas, width, height, filtersContainer){
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.canvas.width = 512;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d');
    this.filtersContainer = filtersContainer;

    // List of filters metadata
    this.filters = [];

    // Pixels of the loaded image, used to start compositing stream
    this.basePixels = null;
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
    this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
    createImageBitmap(blob).then(function (imageBitmap) {
        var aspect = imageBitmap.width / imageBitmap.height;
        if (aspect < 1) {
            _this.ctx.drawImage(imageBitmap, _this.width*aspect/4, 0, _this.width*aspect, _this.height);
        } else if (aspect > 1) {
            _this.ctx.drawImage(imageBitmap, 0, _this.height/(aspect*4), _this.width, _this.height/aspect);
        } else {
            _this.ctx.drawImage(imageBitmap, 0, 0, _this.width, _this.height);
        }
        _this.basePixels = _this.ctx.getImageData(0,0,_this.width,_this.height);
    });
};

ImageTools.prototype.addFilter = function () {
    if (!this.filtersContainer) return;
    this.filters.push({
        name: ImageTools.operations[0],
        param1: 50
    });
    this.renderHtml();
}

ImageTools.prototype.deleteFilter = function () {
    if (!this.filtersContainer) return;
    this.filters.pop();
    this.renderHtml();
}

ImageTools.prototype.changeFilter = function (i, param, value) {;
    this.filters[i][param] = value;
    this.renderHtml();
}

ImageTools.prototype.getNumFilters = function () {
    return this.filtersContainer.querySelectorAll('.filter').length;
}

ImageTools.prototype.addFilterHtml = function () {
    var ops = ImageTools.operations;
    var div = document.createElement('div');
    div.textContent = 'Filter:  ';
    div.classList.add('filter')

    // Select element
    var select = document.createElement('select');
    select.dataset.index = this.getNumFilters();
    for (var i=0;i<ops.length;i++) {
        var option = document.createElement('option');
        option.value = ops[i];
        option.textContent = ops[i];
        select.appendChild(option);
    }
    var _this = this;
    select.addEventListener('change', function() {
        _this.changeFilter(this.dataset.index, 'name', this.value);
        _this.applyFilters();
    });
    div.appendChild(select);

    // Range element
    var range = document.createElement('input');
    range.dataset.index = this.getNumFilters();
    range.type='range';
    range.addEventListener('change', function() {
        _this.changeFilter(this.dataset.index, 'param1', Number(this.value));
        _this.applyFilters();
    });

    div.appendChild(range);
    this.filtersContainer.appendChild(div);
}

ImageTools.prototype.deleteFilterHtml = function () {
    this.filtersContainer.removeChild(this.filtersContainer.children[this.filtersContainer.children.length-1]);
};

ImageTools.prototype.renderHtml = function () {
    var numMissing = this.filters.length - this.getNumFilters();
    if (numMissing !== 0) {
        if (numMissing < 0) {
            for (var i=0;i<Math.abs(numMissing);i++) {
                this.deleteFilterHtml();
            }
        }
        if (numMissing > 0) {
            for (var i=0;i<numMissing;i++) {
                this.addFilterHtml();
            }
        }
    }
};

ImageTools.prototype.applyFilters = function () {
    // Seed the random number generator so that the results are consistent for each run
    Filters.mt.init_genrand(0);

    this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
    var pixels = this.ctx.createImageData(this.width, this.height);//this.basePixels;//
    Filters.copyBuffer(this.basePixels, pixels, this.width, this.height);

    // var pixels = this.ctx.getImageData(0,0,this.width,this.height);

    for (var f = 0; f < this.filters.length; f++) {
        var filter = this.filters[f].name;
        var param1 = this.filters[f].param1;
        pixels = Filters.filterImage(Filters[filter], pixels, param1);
    }
    this.ctx.putImageData(pixels, 0,0);
}

ImageTools.operations = ['grayscale','brightness','noise','threshold','sharpen','blur','sobel'];

