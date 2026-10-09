<?php

test('blueprint client endpoints require authentication', function () {
    $this->getJson('/api/client/extensions/blueprint/eggs?id=blueprint')->assertUnauthorized();
});

test('blueprint admin pages deny unauthenticated access', function () {
    $this->get('/admin/extensions')->assertForbidden();
});

test('core authentication page keeps security headers', function () {
    $this->get('/auth/login')
        ->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
});
