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

    this.disabled = false;
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
    return createImageBitmap(blob).then(function (imageBitmap) {
        var aspect = imageBitmap.width / imageBitmap.height;
        if (aspect < 1) {
            _this.ctx.drawImage(imageBitmap, _this.width*(1-aspect)/2, 0, _this.width*aspect, _this.height);
        } else if (aspect > 1) {
            _this.ctx.drawImage(imageBitmap, 0, _this.height*(1-(1/aspect))/2, _this.width, _this.height/aspect);
        } else {
            _this.ctx.drawImage(imageBitmap, 0, 0, _this.width, _this.height);
        }
        _this.basePixels = _this.ctx.getImageData(0,0,_this.width,_this.height);
    });
};

ImageTools.prototype.addFilter = function () {
    if (!this.filtersContainer) return;
    this.filters.push(JSON.parse(JSON.stringify(ImageTools.defaultFilter)));
    this.renderHtml();
};

ImageTools.prototype.clearFilters = function () {
    while (this.filters.length > 0) {
        this.filters.pop();
    }
    this.renderHtml();
};

ImageTools.prototype.deleteFilter = function () {
    if (!this.filtersContainer) return;
    this.filters.pop();
    this.renderHtml();
};

ImageTools.prototype.changeFilter = function (i, param, value) {;
    this.filters[i][param] = value;
    this.renderHtml();
};

ImageTools.prototype.getNumFilters = function () {
    return this.filtersContainer.querySelectorAll('.filter').length;
};

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
        _this.changeFilter(Number(this.dataset.index), 'name', this.value);
        _this.applyFilters();
    });
    div.appendChild(select);

    // Range element param1
    var range = document.createElement('input');
    range.dataset.index = this.getNumFilters();
    range.type='range';
    range.classList.add('param1')
    range.title = 'Intensity';
    range.addEventListener('change', function() {
        _this.changeFilter(this.dataset.index, 'param1', Number(this.value));
        _this.applyFilters();
    });
    div.appendChild(range);

    var node = document.createTextNode('Mask: ');
    div.appendChild(node);

    // Range element mask
    range = document.createElement('input');
    range.dataset.index = this.getNumFilters();
    range.type='range';
    range.title = 'Mask';
    range.classList.add('mask')
    range.addEventListener('change', function() {
        _this.changeFilter(this.dataset.index, 'mask', Number(this.value));
        _this.applyFilters();
    });
    div.appendChild(range);


    var check = document.createElement('input');
    check.dataset.index = this.getNumFilters();
    check.type='checkbox';
    check.title = 'Invert mask';
    check.classList.add('invert')
    check.addEventListener('change', function() {
        _this.changeFilter(this.dataset.index, 'invert', this.checked);
        _this.applyFilters();
    });
    div.appendChild(check);


    var node = document.createTextNode('Invert');
    div.appendChild(node);

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
    var filterElements = this.filtersContainer.querySelectorAll('.filter');
    for (var i=0;i<filterElements.length;i++) {
        var filterElement = filterElements[i];
        var select = filterElement.querySelector('select');
        select.value = this.filters[i].name;
        var range = filterElement.querySelector('input.param1');
        range.value = this.filters[i].param1;
        range = filterElement.querySelector('input.mask');
        range.value = this.filters[i].mask;
        var check = filterElement.querySelector('input.invert');
        check.checked = this.filters[i].invert;
    }
};

ImageTools.prototype.applyFilters = function () {
    // Seed the random number generator so that the results are consistent for each run
    Filters.mt.init_genrand(0);

    this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
    var pixels = this.ctx.createImageData(this.width, this.height);
    Filters.copyBuffer(this.basePixels, pixels, this.width, this.height);

    if (!this.disabled) {
        for (var f = 0; f < this.filters.length; f++) {
            var filter = this.filters[f].name;
            var param1 = this.filters[f].param1;
            var mask = this.filters[f].mask;
            var invert = this.filters[f].invert;
            var m = Filters.remap(mask, 0, 100, 0, 1);
            pixels = Filters[filter](pixels, param1, 1-m, invert);
        }
    }
    this.ctx.putImageData(pixels, 0,0);
}

ImageTools.operations = ['grayscale','brightness','noise','threshold','sharpen','blur','sobel', 'red', 'green', 'blue', 'temperature', 'contrast'];

ImageTools.defaultFilter = {
    name: ImageTools.operations[0],
    param1: 50,
    mask: 0,
    invert: false
};

ImageTools.presets = {
    happy: [
        { name: 'brightness', param1: 75, mask: 0, invert: false },
        { name: 'temperature', param1: 75, mask: 0, invert: false },
        { name: 'sharpen', param1: 75, mask: 0, invert: false },
    ],
    sad: [
        { name: 'contrast', param1: 25, mask: 0, invert: false },
        { name: 'brightness', param1: 30, mask: 0, invert: false },
        { name: 'temperature', param1: 15, mask: 0, invert: false },
        { name: 'green', param1: 30, mask: 0, invert: false },
    ],
    cozy: [
        { name: 'brightness', param1: 50, mask: 0, invert: false },
        { name: 'temperature', param1: 75, mask: 0, invert: false },
        { name: 'blur', param1: 100, mask: 100, invert: true },
        { name: 'brightness', param1: 50, mask: 0, invert: false },
    ],
    night: [
        { name: 'brightness', param1: 5, mask: 20, invert: false },
        { name: 'brightness', param1: 10, mask: 100, invert: false },
        { name: 'temperature', param1: 0, mask: 0, invert: false },
        { name: 'red', param1: 0, mask: 0, invert: false },
        { name: 'green', param1: 0, mask: 0, invert: false },
        { name: 'noise', param1: 30, mask: 0, invert: false },
    ],
    smog: [
        { name: 'red', param1: 100, mask: 100, invert: false },
        { name: 'red', param1: 100, mask: 100, invert: false },
        { name: 'blur', param1: 50, mask: 100, invert: false },
        { name: 'grayscale', param1: 30, mask: 100, invert: false },
    ],
    bold: [
        { name: 'brightness', param1: 50, mask: 100, invert: false },
        { name: 'contrast', param1: 60, mask: 30, invert: false },
        { name: 'blue', param1: 100, mask: 100, invert: false },
        { name: 'noise', param1: 30, mask: 100, invert: true },
    ]
};

ImageTools.prototype.applyPreset = function (name) {
    this.filters = [].concat(ImageTools.presets[name]);
    this.renderHtml();
};

ImageTools.prototype.toggleAll = function (value) {
    this.disabled = value;
}
