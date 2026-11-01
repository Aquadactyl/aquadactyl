(() => {
    'use strict';

    const form = document.getElementById('appearance-settings');
    const editor = document.getElementById('appearance-editor');
    if (!form || !editor) return;

    const login = document.getElementById('login-preview');
    const client = document.getElementById('client-preview');
    const picker = document.getElementById('primary-color');
    const hex = document.getElementById('primary-color-hex');
    const status = document.getElementById('appearance-save-status');
    const previewUrls = {};
    const pending = {};
    const initial = snapshot();
    let device = 'desktop';

    function snapshot() {
        return JSON.stringify(Array.from(new FormData(form).entries()));
    }

    function release(area) {
        if (previewUrls[area]) URL.revokeObjectURL(previewUrls[area]);
        delete previewUrls[area];
    }

    function savedImageUrl(value, area) {
        if (typeof value !== 'string') return '';
        const prefix = area === 'logo' ? '/storage/branding/' : `/storage/backgrounds/${area}/`;
        if (!value.startsWith(prefix)) return '';
        const filename = value.slice(prefix.length);
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
        editor.querySelectorAll('[data-preview-tab]').forEach((tab) => {
            const selected = tab.dataset.previewTab === area;
            tab.setAttribute('aria-selected', selected ? 'true' : 'false');
            tab.tabIndex = selected ? 0 : -1;
            document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
            if (selected && focus) tab.focus();
        });
    }

    function update() {
        const selected = editor.querySelector('input[name="login_layout"]:checked');
        const layout = selected ? selected.value : 'center';
        const position = document.getElementById('login-logo-position').value;
        login.dataset.layout = device === 'mobile' ? 'center' : layout;
        login.dataset.panel = layout.indexOf('split-') === 0 ? 'split' : 'card';
        login.dataset.logo = (device === 'mobile' || layout === 'center') && position === 'opposite' ? 'above' : position;

        const color = picker.value;
        const channels = [1, 3, 5].map((offset) => {
            const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
            return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
        });
        const contrast = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2] > 0.179 ? '#000000' : '#ffffff';
        const accent = '#' + [1, 3, 5].map((offset) => {
            return Math.round(parseInt(color.slice(offset, offset + 2), 16) * 0.46 + 255 * 0.54).toString(16).padStart(2, '0');
        }).join('');

        [login, client].forEach((preview) => {
            preview.dataset.device = device;
            preview.style.setProperty('--preview-primary', color);
            preview.style.setProperty('--preview-contrast', contrast);
            preview.style.setProperty('--preview-accent', accent);
            preview.style.setProperty('--preview-tint', `${color}2e`);
        });

        editor.querySelectorAll('[data-color]').forEach((swatch) => {
            swatch.setAttribute('aria-pressed', swatch.dataset.color === color ? 'true' : 'false');
        });

        const name = document.getElementById('site-name').value;
        const customLogo = previewImageUrl('logo', editor.dataset.logo);
        const showName = document.getElementById('show-site-name').value === 'true';

        const loginBrand = login.querySelector('.appearance-preview-logo');
        const loginImage = loginBrand.querySelector('img');
        loginImage.src = customLogo || '/branding/aquadactyl-wordmark.png';
        loginImage.hidden = !customLogo && name !== 'Aquadactyl';
        loginBrand.querySelector('.preview-site-name').textContent = (!customLogo && name !== 'Aquadactyl') || showName ? name : '';

        const clientBrand = client.querySelector('.preview-client-brand');
        clientBrand.querySelector('img').src = customLogo || '/branding/aquadactyl-emblem.png';
        clientBrand.querySelector('.preview-site-name').textContent = !customLogo || showName ? name : '';

        document.getElementById('site-logo-preview').src = customLogo || '/branding/aquadactyl-wordmark.png';

        ['login', 'client'].forEach((area) => {
            const preview = area === 'login' ? login : client;
            const background = preview.querySelector('.appearance-preview-background');
            const blur = document.getElementById(`${area}-blur`).value;
            const overlay = document.getElementById(`${area}-overlay`).value;
            document.getElementById(`${area}-blur-value`).textContent = `${blur}px`;
            document.getElementById(`${area}-overlay-value`).textContent = `${overlay}%`;
            const url = previewImageUrl(area, preview.dataset.background);
            background.style.backgroundImage = url ? `url(${JSON.stringify(url)})` : '';
            preview.dataset.hasBackground = url ? 'true' : 'false';
            background.style.filter = `blur(${Number(blur) / 3}px)`;
            preview.style.setProperty('--preview-overlay', url ? Number(overlay) / 100 : 0);
        });

        const translucencyInput = document.getElementById('login-translucency');
        if (translucencyInput) {
            const translucency = Number(translucencyInput.value) || 0;
            const transOutput = document.getElementById('login-translucency-value');
            if (transOutput) transOutput.textContent = `${translucency}%`;
            login.style.setProperty('--preview-box-translucency', (translucency / 100).toString());
        }

        const dirty = snapshot() !== initial;
        status.textContent = dirty ? status.dataset.unsaved : status.dataset.saved;
        status.classList.toggle('has-changes', dirty);
    }

    editor.addEventListener('input', (event) => {
        if (event.target === hex) {
            const valid = /^#[a-f0-9]{6}$/i.test(hex.value);
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
    if (window.jQuery) {
        window.jQuery('#login-logo-position, #show-site-name').on('change', update);
    }

    editor.querySelectorAll('[data-color]').forEach((swatch) => {
        swatch.addEventListener('click', () => {
            picker.value = swatch.dataset.color;
            hex.value = picker.value;
            hex.setAttribute('aria-invalid', 'false');
            update();
        });
    });

    editor.querySelectorAll('.appearance-device-options [data-device]').forEach((button) => {
        button.addEventListener('click', () => {
            device = button.dataset.device;
            editor.querySelectorAll('.appearance-device-options [data-device]').forEach((item) => {
                item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
            });
            update();
        });
    });

    editor.querySelectorAll('[data-preview-tab]').forEach((tab) => {
        tab.addEventListener('click', () => { selectTab(tab.dataset.previewTab); });
        tab.addEventListener('keydown', (event) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                selectTab(event.key === 'Home' ? 'login' : event.key === 'End' ? 'client' : tab.dataset.previewTab === 'login' ? 'client' : 'login', true);
            }
        });
    });

    editor.querySelectorAll('[data-preview-area]').forEach((input) => {
        input.addEventListener('change', () => {
            const area = input.dataset.previewArea;
            if (!['logo', 'login', 'client'].includes(area)) return;
            release(area);
            const file = input.files[0];
            if (file && ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                previewUrls[area] = URL.createObjectURL(file);
            }
            if (area !== 'logo') selectTab(area);
            update();
        });
    });

    editor.querySelectorAll('[data-image-action]').forEach((imageForm) => {
        imageForm.addEventListener('submit', async (event) => {
            // Older browsers retain the normal form submission fallback.
            if (!window.fetch) return;
            event.preventDefault();
            const area = imageForm.dataset.imageAction;
            if (!['logo', 'login', 'client'].includes(area)) return;
            if (pending[area]) return;

            const feedback = editor.querySelector(`[data-image-status="${area}"]`);
            const controls = editor.querySelectorAll(`[data-image-action="${area}"] button, [data-image-action="${area}"] input[type="file"]`);
            const data = new FormData(imageForm);
            controls.forEach((control) => { control.disabled = true; });
            pending[area] = true;
            feedback.textContent = '';
            feedback.classList.remove('text-danger');
            imageForm.setAttribute('aria-busy', 'true');

            try {
                const response = await fetch(imageForm.action, {
                    method: 'POST',
                    body: data,
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });

                let result;
                try {
                    result = await response.json();
                } catch (_) {
                    throw new Error(editor.dataset.uploadError);
                }

                if (!response.ok) {
                    const errors = result.errors;
                    throw new Error(Array.isArray(errors) && errors[0] ? errors[0].detail : result.message || editor.dataset.uploadError);
                }

                const uploadedUrl = savedImageUrl(result.url, area);
                if (result.url && !uploadedUrl) throw new Error(editor.dataset.uploadError);

                if (area === 'logo') editor.dataset.logo = uploadedUrl;
                else (area === 'login' ? login : client).dataset.background = uploadedUrl;

                release(area);
                editor.querySelector(`[data-preview-area="${area}"]`).value = '';
                editor.querySelector(`[data-image-remove="${area}"]`).hidden = !uploadedUrl;
                feedback.textContent = result.message;
                update();
            } catch (error) {
                feedback.classList.add('text-danger');
                feedback.textContent = error.message || editor.dataset.uploadError;
            } finally {
                controls.forEach((control) => { control.disabled = false; });
                imageForm.removeAttribute('aria-busy');
                delete pending[area];
            }
        });
    });

    form.addEventListener('reset', () => {
        window.setTimeout(() => {
            hex.value = picker.value;
            hex.setAttribute('aria-invalid', 'false');
            if (window.jQuery) window.jQuery('#login-logo-position, #show-site-name').trigger('change');
            update();
        }, 0);
    });

    form.addEventListener('submit', (event) => {
        if (!/^#[a-f0-9]{6}$/i.test(hex.value)) {
            event.preventDefault();
            hex.reportValidity();
            hex.focus();
        }
    });

    window.addEventListener('pagehide', () => {
        Object.keys(previewUrls).forEach(release);
    });

    update();
})();
