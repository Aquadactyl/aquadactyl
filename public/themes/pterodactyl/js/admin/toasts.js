(function () {
    'use strict';
    var host = document.createElement('div');
    host.className = 'panel-toasts';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
    function show(message, type) {
        type = type === 'danger' ? 'error' : type;
        if (['error', 'warning', 'success', 'info'].indexOf(type) === -1) type = 'info';
        var toast = document.createElement('div');
        toast.className = 'panel-toast';
        toast.dataset.type = type;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        var icon = document.createElement('i');
        icon.className = 'fa panel-toast-icon fa-' + ({error: 'exclamation-circle', warning: 'exclamation-triangle', success: 'check-circle', info: 'info-circle'})[type];
        icon.setAttribute('aria-hidden', 'true');
        var copy = document.createElement('p');
        copy.textContent = String(message);
        var close = document.createElement('button');
        close.type = 'button';
        close.setAttribute('aria-label', host.dataset.dismiss || 'Dismiss notification');
        var closeIcon = document.createElement('i');
        closeIcon.className = 'fa fa-times';
        closeIcon.setAttribute('aria-hidden', 'true');
        close.appendChild(closeIcon);
        toast.appendChild(icon); toast.appendChild(copy); toast.appendChild(close);
        var timer;
        function dismiss() { clearTimeout(timer); toast.remove(); }
        function pause() { clearTimeout(timer); }
        function resume() { if (type !== 'error') timer = setTimeout(dismiss, 7000); }
        close.addEventListener('click', dismiss);
        toast.addEventListener('mouseenter', pause); toast.addEventListener('mouseleave', resume);
        toast.addEventListener('focusin', pause); toast.addEventListener('focusout', resume);
        host.appendChild(toast);
        while (host.children.length > 5) host.firstElementChild.remove();
        resume();
        return {close: dismiss, update: function (value, text) { copy.textContent = String(typeof value === 'object' ? value.message : text); }};
    }
    window.AquadactylToast = show;
    if (window.jQuery) {
        window.jQuery.notify = function (content, options) { return show(typeof content === 'object' ? content.message : content, (options || {}).type); };
    }
    (window.AquadactylInitialToasts || []).forEach(function (toast) { show(toast.message, toast.type); });
    window.AquadactylInitialToasts = [];
    var options = window.AquadactylNotificationOptions || {};
    var cursor;
    var pending = false;
    var stopped = !options.enabled;
    var pollTimer;
    async function poll() {
        if (stopped || pending || document.hidden) return;
        pending = true;
        clearTimeout(pollTimer);
        try {
            var response = await fetch('/api/client/account/notifications' + (cursor === undefined ? '' : '?after_id=' + cursor), {
                credentials: 'same-origin', headers: {Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest'}
            });
            if (response.status === 401 || response.status === 403) { stopped = true; return; }
            if (!response.ok) return;
            var page = await response.json();
            if (cursor !== undefined) page.data.filter(function (item) { return !item.read_at; }).forEach(function (item) {
                var parts = item.event.split('.');
                var label = options.labels && options.labels[parts[0]] && options.labels[parts[0]][parts[1]] || item.event;
                show(item.server_name + '\n' + label + (item.detail ? ' · ' + item.detail : ''), item.event.endsWith('fail') || item.event === 'server.crash' ? 'warning' : 'info');
            });
            cursor = page.cursor;
        } catch (_) {
            // A temporary connection problem should not create repeated error toasts.
        } finally {
            pending = false;
            if (!stopped) pollTimer = setTimeout(poll, 15000);
        }
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
    poll();
})();
