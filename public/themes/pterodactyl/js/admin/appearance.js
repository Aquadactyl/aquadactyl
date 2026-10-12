(function () {
    'use strict';
    var form = document.getElementById('appearance-settings');
    var editor = document.getElementById('appearance-editor');
    if (!form || !editor) return;
    var login = document.getElementById('login-preview');
    var client = document.getElementById('client-preview');
    var picker = document.getElementById('primary-color');
    var hex = document.getElementById('primary-color-hex');
    var status = document.getElementById('appearance-save-status');
    var previewUrls = {};
    var pending = {};
    var initial = snapshot();
    var device = 'desktop';

    function snapshot() {
        return JSON.stringify(Array.from(new FormData(form).entries()));
    }
    function release(area) {
        if (previewUrls[area]) URL.revokeObjectURL(previewUrls[area]);
        delete previewUrls[area];
    }
    function savedImageUrl(value, area) {
        if (typeof value !== 'string') return '';
        var prefix = area === 'logo' ? '/storage/branding/' : '/storage/backgrounds/' + area + '/';
        if (!value.startsWith(prefix)) return '';
        var filename = value.slice(prefix.length);
        // Uploads are re-encoded by the server as UUID-named PNGs. Never accept
        // arbitrary schemes, external hosts, markup or paths from DOM/API data.
        if (filename.length !== 40 || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.png$/.test(filename)) return '';
        return prefix + encodeURIComponent(filename);
    }
    function previewImageUrl(area, saved) {
        // Only URLs created by this editor may use the blob scheme.
        return previewUrls[area] ? encodeURI(previewUrls[area]) : savedImageUrl(saved, area);
    }
    function selectTab(area, focus) {
        editor.querySelectorAll('[data-preview-tab]').forEach(function (tab) {
            var selected = tab.dataset.previewTab === area;
            tab.setAttribute('aria-selected', selected ? 'true' : 'false');
            tab.tabIndex = selected ? 0 : -1;
            document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
            if (selected && focus) tab.focus();
        });
    }
    function update() {
        var selected = editor.querySelector('input[name="login_layout"]:checked');
        var layout = selected ? selected.value : 'center';
        var position = document.getElementById('login-logo-position').value;
        login.dataset.layout = device === 'mobile' ? 'center' : layout;
        login.dataset.panel = layout.indexOf('split-') === 0 ? 'split' : 'card';
        login.dataset.logo = (device === 'mobile' || layout === 'center') && position === 'opposite' ? 'above' : position;
        var color = picker.value;
        var channels = [1, 3, 5].map(function (offset) {
            var value = parseInt(color.slice(offset, offset + 2), 16) / 255;
            return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4);
        });
        var contrast = (.2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]) > .179 ? '#000000' : '#ffffff';
        var accent = '#' + [1, 3, 5].map(function (offset) {
            return Math.round(parseInt(color.slice(offset, offset + 2), 16) * .46 + 255 * .54).toString(16).padStart(2, '0');
        }).join('');
        [login, client].forEach(function (preview) {
            preview.dataset.device = device;
            preview.style.setProperty('--preview-primary', color);
            preview.style.setProperty('--preview-contrast', contrast);
            preview.style.setProperty('--preview-accent', accent);
            preview.style.setProperty('--preview-tint', color + '2e');
        });
        editor.querySelectorAll('[data-color]').forEach(function (swatch) {
            swatch.setAttribute('aria-pressed', swatch.dataset.color === color ? 'true' : 'false');
        });
        var name = document.getElementById('site-name').value;
        var customLogo = previewImageUrl('logo', editor.dataset.logo);
        var showName = document.getElementById('show-site-name').value === 'true';
        var loginBrand = login.querySelector('.appearance-preview-logo');
        var loginImage = loginBrand.querySelector('img');
        loginImage.src = customLogo || '/branding/aquadactyl-wordmark.png';
        loginImage.hidden = !customLogo && name !== 'Aquadactyl';
        loginBrand.querySelector('.preview-site-name').textContent = (!customLogo && name !== 'Aquadactyl') || showName ? name : '';
        var clientBrand = client.querySelector('.preview-client-brand');
        clientBrand.querySelector('img').src = customLogo || '/branding/aquadactyl-emblem.png';
        clientBrand.querySelector('.preview-site-name').textContent = !customLogo || showName ? name : '';
        document.getElementById('site-logo-preview').src = customLogo || '/branding/aquadactyl-wordmark.png';
        ['login', 'client'].forEach(function (area) {
            var preview = area === 'login' ? login : client;
            var background = preview.querySelector('.appearance-preview-background');
            var blur = document.getElementById(area + '-blur').value;
            var overlay = document.getElementById(area + '-overlay').value;
            document.getElementById(area + '-blur-value').textContent = blur + 'px';
            document.getElementById(area + '-overlay-value').textContent = overlay + '%';
            var url = previewImageUrl(area, preview.dataset.background);
            background.style.backgroundImage = url ? 'url(' + JSON.stringify(url) + ')' : '';
            preview.dataset.hasBackground = url ? 'true' : 'false';
            background.style.filter = 'blur(' + (Number(blur) / 3) + 'px)';
            preview.style.setProperty('--preview-overlay', url ? Number(overlay) / 100 : 0);
        });
        var dirty = snapshot() !== initial;
        status.textContent = dirty ? status.dataset.unsaved : status.dataset.saved;
        status.classList.toggle('has-changes', dirty);
    }

    editor.addEventListener('input', function (event) {
        if (event.target === hex) {
            var valid = /^#[a-f0-9]{6}$/i.test(hex.value);
            hex.setAttribute('aria-invalid', valid ? 'false' : 'true');
            if (!valid) return;
            picker.value = hex.value;
        } else if (event.target === picker) {
            hex.value = picker.value;
            hex.setAttribute('aria-invalid', 'false');
        }
        update();
    });
    editor.addEventListener('change', update);
    if (window.jQuery) window.jQuery('#login-logo-position, #show-site-name').on('change', update);
    editor.querySelectorAll('[data-color]').forEach(function (swatch) {
        swatch.addEventListener('click', function () {
            picker.value = swatch.dataset.color;
            hex.value = picker.value;
            hex.setAttribute('aria-invalid', 'false');
            update();
        });
    });
    editor.querySelectorAll('.appearance-device-options [data-device]').forEach(function (button) {
        button.addEventListener('click', function () {
            device = button.dataset.device;
            editor.querySelectorAll('.appearance-device-options [data-device]').forEach(function (item) {
                item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
            });
            update();
        });
    });
    editor.querySelectorAll('[data-preview-tab]').forEach(function (tab) {
        tab.addEventListener('click', function () { selectTab(tab.dataset.previewTab); });
        tab.addEventListener('keydown', function (event) {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                selectTab(event.key === 'Home' ? 'login' : event.key === 'End' ? 'client' : tab.dataset.previewTab === 'login' ? 'client' : 'login', true);
            }
        });
    });
    editor.querySelectorAll('[data-preview-area]').forEach(function (input) {
        input.addEventListener('change', function () {
            var area = input.dataset.previewArea;
            if (!['logo', 'login', 'client'].includes(area)) return;
            release(area);
            var file = input.files[0];
            if (file && ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) previewUrls[area] = URL.createObjectURL(file);
            if (area !== 'logo') selectTab(area);
            update();
        });
    });
    editor.querySelectorAll('[data-image-action]').forEach(function (imageForm) {
        imageForm.addEventListener('submit', async function (event) {
            // Older browsers retain the normal form submission fallback.
            if (!window.fetch) return;
            event.preventDefault();
            var area = imageForm.dataset.imageAction;
            if (!['logo', 'login', 'client'].includes(area)) return;
            if (pending[area]) return;
            var feedback = editor.querySelector('[data-image-status="' + area + '"]');
            var controls = editor.querySelectorAll('[data-image-action="' + area + '"] button, [data-image-action="' + area + '"] input[type="file"]');
            var data = new FormData(imageForm);
            controls.forEach(function (control) { control.disabled = true; });
            pending[area] = true;
            feedback.textContent = '';
            feedback.classList.remove('text-danger');
            imageForm.setAttribute('aria-busy', 'true');
            try {
                var response = await fetch(imageForm.action, {
                    method: 'POST', body: data, credentials: 'same-origin',
                    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
                });
                var result;
                try { result = await response.json(); }
                catch (_) { throw new Error(editor.dataset.uploadError); }
                if (!response.ok) {
                    var errors = result.errors;
                    throw new Error(Array.isArray(errors) && errors[0] ? errors[0].detail : result.message || editor.dataset.uploadError);
                }
                var uploadedUrl = savedImageUrl(result.url, area);
                if (result.url && !uploadedUrl) throw new Error(editor.dataset.uploadError);
                if (area === 'logo') editor.dataset.logo = uploadedUrl;
                else (area === 'login' ? login : client).dataset.background = uploadedUrl;
                release(area);
                editor.querySelector('[data-preview-area="' + area + '"]').value = '';
                editor.querySelector('[data-image-remove="' + area + '"]').hidden = !uploadedUrl;
                feedback.textContent = result.message;
                update();
            } catch (error) {
                feedback.classList.add('text-danger');
                feedback.textContent = error.message || editor.dataset.uploadError;
            } finally {
                controls.forEach(function (control) { control.disabled = false; });
                imageForm.removeAttribute('aria-busy');
                delete pending[area];
            }
        });
    });
    form.addEventListener('reset', function () {
        window.setTimeout(function () {
            hex.value = picker.value;
            hex.setAttribute('aria-invalid', 'false');
            if (window.jQuery) window.jQuery('#login-logo-position, #show-site-name').trigger('change');
            update();
        }, 0);
    });
    form.addEventListener('submit', function (event) {
        if (!/^#[a-f0-9]{6}$/i.test(hex.value)) {
            event.preventDefault();
            hex.reportValidity();
            hex.focus();
        }
    });
    window.addEventListener('pagehide', function () { Object.keys(previewUrls).forEach(release); });
    update();
})();
