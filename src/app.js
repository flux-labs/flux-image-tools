'use strict';

function FluxApp (clientKey, redirectUri, projectMenu, isProd){
    this._fluxDataSelector = new FluxDataSelector(clientKey, redirectUri, {isProd:isProd});
    this._projectMenu = projectMenu;
    this._keysMenu = document.querySelector('#keysMenu');

    // Setup Flux Data Selector
    this._fluxDataSelector.setOnInitial(this.onInit.bind(this));
    this._fluxDataSelector.setOnLogin(this.onLogin.bind(this));
    this._fluxDataSelector.setOnProjects(this.populateProjects.bind(this));
    this._fluxDataSelector.setOnKeys(this.populateKeys.bind(this));
    this._fluxDataSelector.setOnValue(this.populateValue.bind(this));
    this._fluxDataSelector.init();
    this.keyIsImage = true;
    var filters = document.querySelector('#filters');
    var imageCanvas = document.querySelector('#imageCanvas');
    this.addListener(imageCanvas);
    this.tools = new ImageTools(imageCanvas, 512, 512, filters);
    this.addPresets();
    this.loadDefault();
    this._vpDiv = document.querySelector('#viewport');
    this.hideViewport();
}

FluxApp.keyDescription = 'Image blob';

FluxApp.prototype.addListener = function (imageCanvas) {
    var _this = this;
    imageCanvas.addEventListener('mouseover', function (e) {
        if (!_this.keyIsImage) {
            _this.showViewport();
        }
    });
};

FluxApp.prototype.addPresets = function () {
    var menu = document.querySelector('#presetsMenu');
    var keys = Object.keys(ImageTools.presets);
    for (var i=0;i<keys.length;i++) {
        var key = keys[i];
        var option = document.createElement('option');
        option.value = key;
        option.textContent = key
        menu.appendChild(option);
    }
};

FluxApp.prototype.loadDefault = function () {
    var _this = this;
    this.fileName = 'city';
    fetch('data/city.jpg').then(function(response) {
        return response.blob();
    }).then(function(blob) {
        _this.tools.renderImageBlob(blob);
    });
}
FluxApp.prototype.login = function () {
    this._fluxDataSelector.login();
}

FluxApp.prototype.onInit = function () {
}

FluxApp.prototype.onLogin = function () {
    this._fluxDataSelector.showProjects();

}

FluxApp.prototype.selectProject = function () {
    this._fluxDataSelector.selectProject(this._projectMenu.value);
    this._dt = this._fluxDataSelector.getDataTable(this._projectMenu.value).table;
    this.vp = new FluxViewport(this._vpDiv,{
        projectId: this._projectMenu.value,
        token: this.getFluxToken()
    });
    this.vp.setupDefaultLighting();
    this.vp.homeCamera();
    this.vp.render();
}

FluxApp.prototype.hideViewport = function () {
    this._vpDiv.classList.add('hidden');
}

FluxApp.prototype.showViewport = function () {
    this._vpDiv.classList.remove('hidden');
}

FluxApp.prototype.selectKey = function () {
    this._fluxDataSelector.selectKey(this._keysMenu.value);
    // this._dt = this._fluxDataSelector.getDataTable(this._projectMenu.value).table;
}

FluxApp.prototype.createKey = function (name, data) {
    this._dt.createCell(name, {value:data, description:FluxApp.keyDescription}).then(function (cell) {
        console.log(cell);
    });
}

FluxApp.prototype.populateProjects = function (projectPromise) {
    var _this = this;
    projectPromise.then(function (projects) {
        for (var i=projects.entities.length-1;i>=0;i--) {
            var entity = projects.entities[i];
            var option = document.createElement('option');
            _this._projectMenu.appendChild(option);
            option.value = entity.id;
            option.textContent = entity.name;
        }
    });
}

FluxApp.prototype.populateKeys = function (keysPromise) {
    var _this = this;
    keysPromise.then(function (keys) {
        for (var i=0;i<keys.entities.length;i++) {
            var entity = keys.entities[i];
            var option = document.createElement('option');
            _this._keysMenu.appendChild(option);
            option.value = entity.id;
            option.textContent = entity.label;
        }
    });
}

FluxApp.prototype.populateValue = function (valuePromise) {
    var _this = this;
    valuePromise.then(function (entity) {
        var dataUrl = entity.value;
        if (typeof dataUrl !== 'string' || dataUrl.indexOf('image') === -1) {
            console.log('Not an image');
            _this.vp.setGeometryEntity(entity.value);
            _this.keyIsImage = false;
            _this.showViewport();
            return;
        } else {
            _this.keyIsImage = true;
            _this.hideViewport();
        }
        fetch(dataUrl).then(function(response) {
            return response.blob();
        }).then(function(blob) {
            _this.tools.renderImageBlob(blob);
            _this.fileName = entity.label;
        });
    });
}

FluxApp.prototype.logout = function () {
    this._fluxDataSelector.logout();
}

/**
 * Gets the flux token from it's place in cookies or localStorage.
 */
FluxApp.prototype.getFluxToken = function () {
    var fluxCredentials = JSON.parse(localStorage.getItem('fluxCredentials'));
    return fluxCredentials.fluxToken;
}

FluxApp.prototype.fileChanged = function (selector) {
    // file name map
    var files = selector.files;
    for (var i=0;i<files.length; i++) {
        var file = selector.files[i];
        this._readImageFile(file);
    }
};

FluxApp.prototype._readImageFile = function (imageFile) {
    var _this = this
    this.tools.renderImageBlob(imageFile);
    this.fileName = FluxApp.stripExtension(imageFile.name);

};

FluxApp.stripExtension = function (fileName) {
    var i = fileName.indexOf('.');
    if (i===-1) return fileName;
    return fileName.substring(0,i);
}

FluxApp.prototype.downloadImage = function () {
    var dataUrl = this.tools.getDataUrl();
    if (dataUrl.length > 1000000) {
        console.warn('this is a large image ('+dataUrl.length+' encoded characters) and the download may fail');
    }
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = FluxApp.addExtension(this.fileName);
    a.click();
}
FluxApp.addExtension = function (fileName) {
    if (fileName.indexOf('.')===-1) {
        fileName += '.png';
    }
    return fileName;
};

FluxApp.prototype.uploadImage = function () {
    var fileNameBase = FluxApp.stripExtension(this.fileName);
    var dataUrl = this.tools.getDataUrl();
    this.createKey(fileNameBase, dataUrl);
}

FluxApp.prototype.isViewportHidden = function () {
    var cl = this._vpDiv.classList;
    for (var i=0;i<cl.length;i++) {
        if (cl[i] === 'hidden') {
            return true;
        }
    }
    return false;
};

FluxApp.prototype.applyFilters = function () {
    var _this = this;
    // check if viewport is on
    if (this.vp && !this.isViewportHidden()) {
        fetch(this.vp.getGlCanvas().toDataURL()).then(function(response) {
            return response.blob();
        }).then(function(blob) {
            _this.tools.renderImageBlob(blob);
            _this.fileName = 'interactive';
            _this.hideViewport();
            setTimeout(function () {
                _this.tools.applyFilters();
            },100);
        });
    } else {
        this.tools.applyFilters();
    }
};

FluxApp.prototype.addFilter = function (container) {
    this.tools.addFilter();
    this.tools.applyFilters();
};

FluxApp.prototype.deleteFilter = function (container) {
    this.tools.deleteFilter();
    this.tools.applyFilters();
};

FluxApp.prototype.presetChanged = function (value) {
    if (value === 'default') {
        this.tools.clearFilters();
    } else {
        this.tools.applyPreset(value);
    }
    this.tools.applyFilters();
};

FluxApp.prototype.toggleAll = function (value) {
    this.tools.toggleAll(value);
    this.tools.applyFilters();
}
