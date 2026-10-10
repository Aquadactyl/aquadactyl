<?php

return [
    /*
     * Enable or disable captchas
     */
    'enabled' => env('RECAPTCHA_ENABLED', false),

    /*
     * Selected captcha provider ('recaptcha', 'hcaptcha', 'turnstile')
     */
    'provider' => env('RECAPTCHA_PROVIDER', 'recaptcha'),

    /*
     * API endpoint for verification checks.
     */
    'domain' => env('RECAPTCHA_DOMAIN', 'https://www.google.com/recaptcha/api/siteverify'),

    /*
     * Verification endpoints by provider.
     */
    'endpoints' => [
        'recaptcha' => 'https://www.google.com/recaptcha/api/siteverify',
        'hcaptcha' => 'https://api.hcaptcha.com/siteverify',
        'turnstile' => 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    ],

    /*
     * Secret key for verification.
     */
    'secret_key' => env('RECAPTCHA_SECRET_KEY', ''),

    /*
     * Website site key for frontend.
     */
    'website_key' => env('RECAPTCHA_WEBSITE_KEY', ''),

    /*
     * Domain verification compares the domain used when solving the captcha.
     */
    'verify_domain' => false,
];
