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
(function ($) {
    'use strict';

    $.urlParam = function (name) {
        return new URLSearchParams(window.location.search).get(name);
    };

    window.getPageName = function (url) {
        if (!url) return '';
        var parts = url.split('/');
        return parts[parts.length - 1].split('.')[0];
    };

    // Remember active tab and navigate to it on reload
    $(function () {
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            var tab = $(e.target).attr('href');
            if (!tab || !tab.startsWith('#')) return;
            var params = new URLSearchParams(window.location.search);
            params.set('tab', tab.slice(1));
            window.history.replaceState(null, '', window.location.pathname + '?' + params.toString());
        });

        var activeTab = $.urlParam('tab');
        if (activeTab) {
            $('.nav.nav-tabs a[href="#' + activeTab + '"]').tab('show');
        }
    });
})(window.jQuery);
