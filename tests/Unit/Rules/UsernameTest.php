<?php

use Pterodactyl\Rules\Username;

test('rule is stringable', function () {
    expect((string) new Username())->toBe('p_username');
});

test('valid usernames', function (string $username) {
    expect((new Username())->passes('test', $username))->toBeTrue();
})->with([
    'username',
    'user_name',
    'user.name',
    'user-name',
    '123username123',
    '123-user.name',
    '123456',
]);

test('invalid usernames', function (string $username) {
    expect((new Username())->passes('test', $username))->toBeFalse();
})->with([
    '_username',
    'username_',
    '_username_',
    '-username',
    '.username',
    'username-',
    'username.',
    'user*name',
    'user^name',
    'user#name',
    'user+name',
    '1234_',
]);
