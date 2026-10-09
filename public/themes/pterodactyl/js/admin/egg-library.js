(function () {
    'use strict';

    window.jQuery(function ($) {
        $('.egg-library-select').select2({ width: '100%' });
        const source = document.getElementById('egg-source');
        if (source) $(source).on('change', function () { $('#egg-category').val('').trigger('change'); });
        const form = document.getElementById('egg-import-form');
        if (!form) return;

        const nest = document.getElementById('egg-nest');
        const name = document.getElementById('egg-new-nest-name');
        const newNest = document.getElementById('egg-new-nest');
        const importButton = document.getElementById('egg-import-button');
        const existingLink = document.getElementById('egg-existing-link');
        const existingNote = document.getElementById('egg-existing-note');
        const existing = JSON.parse(form.dataset.existingEggs || '{}');

        const update = function () {
            const createNew = nest.value === 'new';
            newNest.hidden = !createNew;
            name.disabled = !createNew;
            name.required = createNew;
            const eggId = existing[nest.value];
            importButton.hidden = !!eggId;
            importButton.disabled = !!eggId || !nest.value;
            existingLink.hidden = !eggId;
            existingNote.hidden = !eggId;
            if (eggId) existingLink.href = form.dataset.eggViewUrl + '/' + eggId;
        };
        $(nest).on('change', update);
        update();
        form.addEventListener('submit', function () {
            importButton.disabled = true;
            importButton.textContent = 'Importing…';
        });
    });
})();
