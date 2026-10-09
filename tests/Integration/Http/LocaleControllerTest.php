<?php

test('single namespace activity descriptions still load', function () {
    $this->getJson('/locales/locale.json?locale=en&namespace=activity')
        ->assertOk()
        ->assertJsonPath('en.activity.auth.success', 'Logged in')
        ->assertJsonPath('en.activity.server.file.read', 'Viewed the contents of {{file}}');
});

test('multiload requests accept both query string and encoded plus separators', function (string $separator) {
    $this->getJson('/locales/locale.json?locale=en' . $separator . 'fr&namespace=translation' . $separator . 'activity')
        ->assertOk()
        ->assertJsonStructure(['en' => ['translation', 'activity'], 'fr' => ['translation', 'activity']])
        ->assertJsonPath('en.activity.auth.success', 'Logged in');
})->with(['+', '%2B']);

test('multiload validation rejects paths and unbounded groups', function (string $query) {
    $this->getJson('/locales/locale.json?' . $query)->assertUnprocessable();
})->with([
    'locale=en&namespace=..%2Factivity',
    'locale=en&namespace=activity%2B..%2Fconfig',
    'locale=..%2Fen&namespace=activity',
    'locale=en&namespace=' . implode('%2B', array_fill(0, 11, 'activity')),
]);
