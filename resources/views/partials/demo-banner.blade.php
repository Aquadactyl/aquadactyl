@if(config('aquadactyl.demo.enabled', false))
    <style>body {padding-bottom:48px} .demo-banner {position:fixed;bottom:0;left:0;right:0;z-index:2000;padding:10px 18px;background:#143243;color:#dcf4ff;font:13px/1.6 Inter,system-ui,sans-serif;text-align:center;border-top:1px solid #36586c} @media(max-width:640px){body{padding-bottom:90px}.demo-banner{font-size:11px;padding:8px 12px}}</style>
    <aside class="demo-banner" aria-label="Public demo information">
        <strong>Aquadactyl live demo</strong> · Shared sample data · Resets every 5 minutes ·
        <span id="demo-reset-timer">Next reset shortly</span> ·
        <a href="https://aquadactyl.uk" style="color:#9cdefd;text-decoration:underline">Aquadactyl website ↗</a>
    </aside>
    <script>
        (() => {
            const element = document.getElementById('demo-reset-timer');
            const update = () => {
                const remaining = 300 - Math.floor(Date.now() / 1000) % 300;
                element.textContent = 'Next reset in ' + Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0');
            };
            update(); setInterval(update, 1000);
        })();
    </script>
@endif
