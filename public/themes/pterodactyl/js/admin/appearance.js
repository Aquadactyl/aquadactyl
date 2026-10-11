(function () {
    'use strict';
    var form = document.getElementById('appearance-settings');
    if (!form) return;
    var login = document.getElementById('login-preview');
    var client = document.getElementById('client-preview');
    var previewUrls = {};
    function update() {
        var selected = form.querySelector('input[name="login_layout"]:checked');
        var layout = selected ? selected.value : 'center';
        var position = document.getElementById('login-logo-position').value;
        login.dataset.layout = layout;
        login.dataset.logo = layout === 'center' && position === 'opposite' ? 'above' : position;
        var color = document.getElementById('primary-color').value;
        document.getElementById('primary-color-value').textContent = color;
        var channels = [1, 3, 5].map(function (offset) {
            var value = parseInt(color.slice(offset, offset + 2), 16) / 255;
            return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4);
        });
        var contrast = (.2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]) > .179 ? '#000000' : '#ffffff';
        [login, client].forEach(function (preview) { preview.style.setProperty('--preview-primary', color); preview.style.setProperty('--preview-contrast', contrast); });
        ['login', 'client'].forEach(function (area) {
            var preview = area === 'login' ? login : client;
            var background = preview.querySelector('.appearance-preview-background');
            var blur = document.getElementById(area + '-blur').value;
            var overlay = document.getElementById(area + '-overlay').value;
            document.getElementById(area + '-blur-value').textContent = blur + 'px';
            document.getElementById(area + '-overlay-value').textContent = overlay + '%';
            var url = previewUrls[area] || preview.dataset.background;
            background.style.backgroundImage = url ? 'url(' + JSON.stringify(url) + ')' : '';
            background.style.filter = 'blur(' + (Number(blur) / 3) + 'px)';
            preview.style.setProperty('--preview-overlay', Number(overlay) / 100);
        });
    }
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    // Select2 updates must also refresh the preview.
    window.jQuery('#login-logo-position').on('change', update);
    document.querySelectorAll('[data-preview-area]').forEach(function (input) {
        input.addEventListener('change', function () {
            var area = input.dataset.previewArea;
            if (previewUrls[area]) URL.revokeObjectURL(previewUrls[area]);
            delete previewUrls[area];
            var file = input.files[0];
            if (file && ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) previewUrls[area] = URL.createObjectURL(file);
            update();
        });
    });
    update();
})();
