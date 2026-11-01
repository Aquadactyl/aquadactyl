(function ($) {
    'use strict';

    $(function () {
        const $modal = $('#transferServerModal');
        const $node = $('#pNodeId');
        const $allocation = $('#pAllocation');
        const $additional = $('#pAllocationAdditional');

        function updateAdditionalAllocations() {
            const currentAllocation = $allocation.val();
            const currentNode = $node.val();

            const node = (window.Pterodactyl?.nodeData || []).find((v) => String(v.id) === String(currentNode));
            if (node) {
                const allocations = (node.allocations || []).filter(
                    (a) => String(a.id) !== String(currentAllocation)
                );

                $additional.html('').select2({
                    data: allocations,
                    placeholder: window.AquadactylAdmin.translate('select_additional_allocations', 'Select Additional Allocations'),
                    dropdownParent: $modal,
                });
            }
        }

        $node.select2({
            placeholder: window.AquadactylAdmin.translate('select_node', 'Select a Node'),
            dropdownParent: $modal,
        }).on('change', function () {
            const currentNode = $(this).val();
            const node = (window.Pterodactyl?.nodeData || []).find((v) => String(v.id) === String(currentNode));

            if (node) {
                $allocation.html('').select2({
                    data: node.allocations,
                    placeholder: window.AquadactylAdmin.translate('select_default_allocation', 'Select a Default Allocation'),
                    dropdownParent: $modal,
                });

                updateAdditionalAllocations();
            }
        });

        $allocation.select2({
            placeholder: window.AquadactylAdmin.translate('select_default_allocation', 'Select a Default Allocation'),
            dropdownParent: $modal,
        }).on('change', updateAdditionalAllocations);

        $additional.select2({
            placeholder: window.AquadactylAdmin.translate('select_additional_allocations', 'Select Additional Allocations'),
            dropdownParent: $modal,
        });

        $node.trigger('change');
    });
})(window.jQuery);
