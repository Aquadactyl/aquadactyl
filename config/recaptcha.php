<?php

return [
    /*
     * Enable or disable captchas
     */
    'enabled' => env('RECAPTCHA_ENABLED', false),

    /*
     * API endpoint for recaptcha checks. You should not edit this.
     */
    'domain' => env('RECAPTCHA_DOMAIN', 'https://www.google.com/recaptcha/api/siteverify'),

    /*
     * Secret key for reCAPTCHA verification.
     */
    'secret_key' => env('RECAPTCHA_SECRET_KEY', ''),

    /*
     * Website site key for reCAPTCHA frontend.
     */
    'website_key' => env('RECAPTCHA_WEBSITE_KEY', ''),

    /*
     * Domain verification compares the domain used when solving the captcha.
     */
    'verify_domain' => false,
];
