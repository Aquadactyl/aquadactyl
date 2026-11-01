@php
    $adminMessages = [
        'select_options', 'select_node', 'select_default_allocation', 'select_additional_allocations',
        'select_service_pack', 'select_docker_image', 'no_service_pack', 'select_a_nest', 'select_a_nest_egg',
        'select_error_loading', 'select_input_too_long', 'select_input_too_short', 'select_maximum_selected',
        'select_no_results', 'select_searching', 'select_remove_all', 'cancel', 'confirm',
    ];
    $adminTranslations = [];
    foreach ($adminMessages as $key) {
        $adminTranslations[$key] = __('admin/ui.' . $key);
    }
@endphp
<script>
    window.AquadactylAdmin = {
        messages: {{ Illuminate\Support\Js::from($adminTranslations) }},
        translate: function (key, fallback, replacements) {
            var text = this.messages[key] || fallback;
            Object.keys(replacements || {}).forEach(function (name) {
                text = text.split(':' + name).join(String(replacements[name]));
            });
            return text;
        },
    };
    $.fn.select2.defaults.set('language', {
        errorLoading: function () {
            return window.AquadactylAdmin.translate('select_error_loading');
        },
        inputTooLong: function (args) {
            return window.AquadactylAdmin.translate('select_input_too_long', '', { count: args.input.length - args.maximum });
        },
        inputTooShort: function (args) {
            return window.AquadactylAdmin.translate('select_input_too_short', '', { count: args.minimum - args.input.length });
        },
        maximumSelected: function (args) {
            return window.AquadactylAdmin.translate('select_maximum_selected', '', { count: args.maximum });
        },
        noResults: function () {
            return window.AquadactylAdmin.translate('select_no_results');
        },
        searching: function () {
            return window.AquadactylAdmin.translate('select_searching');
        },
        removeAllItems: function () {
            return window.AquadactylAdmin.translate('select_remove_all');
        },
    });
    // Preserve the panel's callback adapter and helpers while adding translated defaults.
    var adminOriginalSwal = window.swal;
    window.swal = Object.assign(function (options, callback) {
        if (options && typeof options === 'object') {
            options = Object.assign({
                cancelButtonText: window.AquadactylAdmin.translate('cancel'),
                confirmButtonText: window.AquadactylAdmin.translate('confirm'),
            }, options);
            return adminOriginalSwal(options, callback);
        }
        return adminOriginalSwal.apply(this, arguments);
    }, adminOriginalSwal);
</script>
