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
    'locale=en&namespace=acti%0Avity',
    'locale=e%0An&namespace=activity',
]);

test('regional language packs and safe addon namespaces can be requested', function () {
    $this->getJson('/locales/locale.json?locale=pt-BR%2Bzh-Hant%2Ben&namespace=panel%2Bmy_addon')
        ->assertOk()
        ->assertJsonStructure(['pt-BR' => ['panel', 'my_addon'], 'zh-Hant' => ['panel', 'my_addon'], 'en' => ['panel', 'my_addon']])
        ->assertJsonPath('en.panel.language.current', 'Currently using {{language}}.');
});

test('bundled French and German catalogs load together with converted placeholders', function () {
    $this->getJson('/locales/locale.json?locale=fr%2Bde&namespace=panel%2Bactivity%2Bvalidation')
        ->assertOk()
        ->assertJsonPath('fr.panel.language.label', 'Langue du panel')
        ->assertJsonPath('de.panel.language.label', 'Panel-Sprache')
        ->assertJsonPath('fr.panel.language.current', 'Langue actuelle : {{language}}.')
        ->assertJsonPath('de.panel.language.current', 'Aktuelle Sprache: {{language}}.')
        ->assertJsonPath('fr.panel.login.continue_with_provider', 'Continuer avec {{provider}}')
        ->assertJsonPath('de.panel.login.continue_with_provider', 'Mit {{provider}} fortfahren')
        ->assertJsonPath('fr.activity.server.file.read', 'Contenu de {{file}} consulté')
        ->assertJsonPath('de.activity.server.file.read', 'Inhalt von {{file}} angesehen')
        ->assertJsonPath('fr.validation.required', 'Le champ {{attribute}} est obligatoire.')
        ->assertJsonPath('de.validation.required', 'Das Feld {{attribute}} ist erforderlich.');
});
