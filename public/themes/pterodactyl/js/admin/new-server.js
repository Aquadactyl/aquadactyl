// Copyright (c) 2015 - 2017 Dane Everitt <dane@daneeveritt.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
$(document).ready(function () {
    $('#pNestId').select2({
        placeholder: window.AquadactylAdmin.translate('select_a_nest', 'Select a Nest'),
    }).change();

    $('#pEggId').select2({
        placeholder: window.AquadactylAdmin.translate('select_a_nest_egg', 'Select a Nest Egg'),
    });

    $('#pPackId').select2({
        placeholder: window.AquadactylAdmin.translate('select_service_pack', 'Select a Service Pack'),
    });

    $('#pNodeId').select2({
        placeholder: window.AquadactylAdmin.translate('select_node', 'Select a Node'),
    }).change();

    $('#pAllocation').select2({
        placeholder: window.AquadactylAdmin.translate('select_default_allocation', 'Select a Default Allocation'),
    });

    $('#pAllocationAdditional').select2({
        placeholder: window.AquadactylAdmin.translate('select_additional_allocations', 'Select Additional Allocations'),
    });

    $('#pDefaultContainer').select2({
        placeholder: window.AquadactylAdmin.translate('select_docker_image', 'Select a Docker image'),
    });
});

let lastActiveBox = null;
$(document).on('click', function (event) {
    if (lastActiveBox !== null) {
        lastActiveBox.removeClass('box-primary');
    }

    lastActiveBox = $(event.target).closest('.box');
    lastActiveBox.addClass('box-primary');
});

$('#pNodeId').on('change', function () {
    const currentNode = $(this).val();
    const node = (Pterodactyl.nodeData || []).find((v) => String(v.id) === String(currentNode));

    if (node) {
        $('#pAllocation').html('').select2({
            data: node.allocations,
            placeholder: window.AquadactylAdmin.translate('select_default_allocation', 'Select a Default Allocation'),
        });

        updateAdditionalAllocations();
    }
});

$('#pNestId').on('change', function () {
    const eggs = Pterodactyl.nests?.[$(this).val()]?.eggs || [];
    $('#pEggId').html('').select2({
        data: $.map(eggs, function (item) {
            return {
                id: item.id,
                text: item.name,
            };
        }),
    }).change();
});

$('#pEggId').on('change', function () {
    const parentChain = Pterodactyl.nests?.[$('#pNestId').val()] || null;
    const objectChain = parentChain?.eggs?.[$(this).val()] || null;

    const images = objectChain?.docker_images || {};
    const $container = $('#pDefaultContainer').empty();
    Object.entries(images).forEach(([label, value]) => {
        $container.append(new Option(`${label} (${value})`, value));
    });
    $container.trigger('change.select2');

    if (!objectChain?.startup) {
        $('#pStartup').val(parentChain?.startup ?? 'ERROR: Startup Not Defined!');
    } else {
        $('#pStartup').val(objectChain.startup);
    }

    const packs = objectChain?.packs || [];
    $('#pPackId').html('').select2({
        data: [{ id: 0, text: window.AquadactylAdmin.translate('no_service_pack', 'No Service Pack') }].concat(
            $.map(packs, function (item) {
                return {
                    id: item.id,
                    text: item.name + ' (' + item.version + ')',
                };
            })
        ),
    });

    function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    const variableIds = {};
    const $variables = $('#appendVariablesTo').empty();
    const variables = objectChain?.variables || [];
    $.each(variables, function (i, item) {
        variableIds[item.env_variable] = 'var_ref_' + item.id;

        const isRequired = (item.required === 1) ? '<span class="label label-danger">Required</span> ' : '';
        const dataAppend = ' \
            <div class="form-group col-sm-6"> \
                <label for="var_ref_' + escapeHtml(item.id) + '" class="control-label">' + isRequired + escapeHtml(item.name) + '</label> \
                <input type="text" id="var_ref_' + escapeHtml(item.id) + '" autocomplete="off" name="environment[' + escapeHtml(item.env_variable) + ']" class="form-control" value="' + escapeHtml(item.default_value) + '" /> \
                <p class="text-muted small">' + escapeHtml(item.description) + '<br /> \
                <strong>Access in Startup:</strong> <code>{{' + escapeHtml(item.env_variable) + '}}</code><br /> \
                <strong>Validation Rules:</strong> <code>' + escapeHtml(item.rules) + '</code></small></p> \
            </div> \
        ';
        $variables.append(dataAppend);
    });

    // If you receive a warning on this line, it should be fine to ignore. this function is
    // defined in "resources/views/admin/servers/new.blade.php" near the bottom of the file.
    serviceVariablesUpdated($('#pEggId').val(), variableIds);
});

$('#pAllocation').on('change', function () {
    updateAdditionalAllocations();
});

function updateAdditionalAllocations() {
    const currentAllocation = $('#pAllocation').val();
    const currentNode = $('#pNodeId').val();

    const node = (Pterodactyl.nodeData || []).find((v) => String(v.id) === String(currentNode));
    if (node) {
        const allocations = (node.allocations || []).filter(
            (a) => String(a.id) !== String(currentAllocation)
        );

        $('#pAllocationAdditional').html('').select2({
            data: allocations,
            placeholder: window.AquadactylAdmin.translate('select_additional_allocations', 'Select Additional Allocations'),
        });
    }
}

function initUserIdSelect(data) {
    function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    $('#pUserId').select2({
        ajax: {
            url: '/admin/users/accounts.json',
            dataType: 'json',
            delay: 250,

            data: function (params) {
                return {
                    filter: { email: params.term },
                    page: params.page,
                };
            },

            processResults: function (data) {
                return { results: data };
            },

            cache: true,
        },

        data: data,
        escapeMarkup: function (markup) { return markup; },
        minimumInputLength: 2,
        templateResult: function (data) {
            if (data.loading) return escapeHtml(data.text);

            return '<div class="user-block"> \
                <img class="img-circle img-bordered-xs" src="https://www.gravatar.com/avatar/' + escapeHtml(data.md5) + '?s=120" alt=""> \
                <span class="username"> \
                    <a href="#">' + escapeHtml(data.name_first) + ' ' + escapeHtml(data.name_last) +'</a> \
                </span> \
                <span class="description"><strong>' + escapeHtml(data.email) + '</strong> - ' + escapeHtml(data.username) + '</span> \
            </div>';
        },
        templateSelection: function (data) {
            return '<div> \
                <span> \
                    <img class="img-rounded img-bordered-xs" src="https://www.gravatar.com/avatar/' + escapeHtml(data.md5) + '?s=120" style="height:28px;margin-top:-4px;" alt=""> \
                </span> \
                <span style="padding-left:5px;"> \
                    ' + escapeHtml(data.name_first) + ' ' + escapeHtml(data.name_last) + ' (<strong>' + escapeHtml(data.email) + '</strong>) \
                </span> \
            </div>';
        }
    });
}
