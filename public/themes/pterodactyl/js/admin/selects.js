// Enhance selects left native by individual admin pages, including fields added
// later by Blueprint. Existing Select2 widgets retain their page-specific setup.
(($) => {
    'use strict';

    function enhance(elements) {
        elements.each(function () {
            const $this = $(this);
            if ($this.data('select2')) return;
            const modal = $this.closest('.modal');
            $this.select2({
                width: '100%',
                minimumResultsForSearch: this.options.length > 7 ? 0 : Infinity,
                placeholder: this.multiple
                    ? window.AquadactylAdmin.translate('select_options', 'Select options')
                    : undefined,
                dropdownParent: modal.length ? modal : $(document.body),
            });
        });
    }

    $(() => {
        // Page handlers initialize AJAX, dependent and multi-select fields first.
        setTimeout(() => {
            enhance($('select.form-control'));

            new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            enhance($(node).find('select.form-control').addBack('select.form-control'));
                        }
                    });
                });
            }).observe(document.body, { childList: true, subtree: true });
        }, 0);
    });
})(window.jQuery);
