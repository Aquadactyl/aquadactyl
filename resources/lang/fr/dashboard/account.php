<?php

return [
    'email' => [
        'title' => 'Modifier votre adresse e-mail',
        'updated' => 'Votre adresse e-mail a été mise à jour.',
    ],
    'password' => [
        'title' => 'Modifier votre mot de passe',
        'requirements' => 'Votre nouveau mot de passe doit contenir au moins 8 caractères.',
        'updated' => 'Votre mot de passe a été mis à jour.',
    ],
    'two_factor' => [
        'button' => 'Configurer l’authentification à deux facteurs',
        'disabled' => 'L’authentification à deux facteurs a été désactivée sur votre compte. Aucun code ne vous sera demandé lors de la connexion.',
        'enabled' => 'L’authentification à deux facteurs a été activée sur votre compte ! Un code généré par votre appareil vous sera désormais demandé lors de la connexion.',
        'invalid' => 'Le code fourni est invalide.',
        'setup' => [
            'title' => 'Configurer l’authentification à deux facteurs',
            'help' => 'Vous ne pouvez pas scanner le code ? Saisissez le code ci-dessous dans votre application :',
            'field' => 'Saisir le code',
        ],
        'disable' => [
            'title' => 'Désactiver l’authentification à deux facteurs',
            'field' => 'Saisir le code',
        ],
    ],
];
