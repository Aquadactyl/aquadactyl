(() => {
    'use strict';

    const host = document.createElement('div');
    host.className = 'panel-toasts';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);

    const ICON_MAP = {
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        success: 'check-circle',
        info: 'info-circle',
    };

    function show(message, rawType) {
        let type = rawType === 'danger' ? 'error' : rawType;
        if (!['error', 'warning', 'success', 'info'].includes(type)) {
            type = 'info';
        }

        const toast = document.createElement('div');
        toast.className = 'panel-toast';
        toast.dataset.type = type;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

        const icon = document.createElement('i');
        icon.className = `fa panel-toast-icon fa-${ICON_MAP[type]}`;
        icon.setAttribute('aria-hidden', 'true');

        const copy = document.createElement('p');
        copy.textContent = String(message);

        const close = document.createElement('button');
        close.type = 'button';
        close.setAttribute('aria-label', host.dataset.dismiss || 'Dismiss notification');

        const closeIcon = document.createElement('i');
        closeIcon.className = 'fa fa-times';
        closeIcon.setAttribute('aria-hidden', 'true');
        close.appendChild(closeIcon);

        toast.appendChild(icon);
        toast.appendChild(copy);
        toast.appendChild(close);

        let timer;
        const dismiss = () => {
            clearTimeout(timer);
            toast.remove();
        };
        const pause = () => clearTimeout(timer);
        const resume = () => {
            if (type !== 'error') {
                timer = setTimeout(dismiss, 7000);
            }
        };

        close.addEventListener('click', dismiss);
        toast.addEventListener('mouseenter', pause);
        toast.addEventListener('mouseleave', resume);
        toast.addEventListener('focusin', pause);
        toast.addEventListener('focusout', resume);

        host.appendChild(toast);
        while (host.children.length > 5) {
            host.firstElementChild.remove();
        }

        resume();

        return {
            close: dismiss,
            update: (value, text) => {
                copy.textContent = String(typeof value === 'object' && value !== null ? value.message : text);
            },
        };
    }

    window.AquadactylToast = show;

    if (window.jQuery) {
        window.jQuery.notify = (content, options) => {
            const message = typeof content === 'object' && content !== null ? content.message : content;
            return show(message, (options || {}).type);
        };
    }

    (window.AquadactylInitialToasts || []).forEach((toast) => {
        show(toast.message, toast.type);
    });
    window.AquadactylInitialToasts = [];

    const options = window.AquadactylNotificationOptions || {};
    let cursor;
    let pending = false;
    let stopped = !options.enabled;
    let pollTimer;

    async function poll() {
        if (stopped || pending || document.hidden) return;
        pending = true;
        clearTimeout(pollTimer);

        try {
            const url = `/api/client/account/notifications${cursor === undefined ? '' : `?after_id=${cursor}`}`;
            const response = await fetch(url, {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (response.status === 401 || response.status === 403) {
                stopped = true;
                return;
            }
            if (!response.ok) return;

            const page = await response.json();
            if (cursor !== undefined) {
                page.data
                    .filter((item) => !item.read_at)
                    .forEach((item) => {
                        const parts = item.event.split('.');
                        const label = (options.labels && options.labels[parts[0]] && options.labels[parts[0]][parts[1]]) || item.event;
                        const isWarning = item.event.endsWith('fail') || item.event === 'server.crash';
                        show(`${item.server_name}\n${label}${item.detail ? ` · ${item.detail}` : ''}`, isWarning ? 'warning' : 'info');
                    });
            }
            cursor = page.cursor;
        } catch (_) {
            // A temporary connection problem should not create repeated error toasts.
        } finally {
            pending = false;
            if (!stopped) {
                pollTimer = setTimeout(poll, 15000);
            }
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) poll();
    });

    poll();
})();
