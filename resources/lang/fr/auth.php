<?php

return [
    'sign_in' => 'Se connecter',
    'go_to_login' => 'Aller à la connexion',
    'failed' => 'Aucun compte ne correspond à ces identifiants.',

    'forgot_password' => [
        'label' => 'Mot de passe oublié ?',
        'label_help' => 'Saisissez l’adresse e-mail de votre compte pour recevoir les instructions de réinitialisation du mot de passe.',
        'button' => 'Récupérer le compte',
    ],

    'reset_password' => [
        'button' => 'Réinitialiser et se connecter',
    ],

    'two_factor' => [
        'label' => 'Code à deux facteurs',
        'label_help' => 'Ce compte nécessite une seconde étape d’authentification. Saisissez le code généré par votre appareil pour terminer la connexion.',
        'checkpoint_failed' => 'Le code d’authentification à deux facteurs est invalide.',
    ],

    'throttle' => 'Trop de tentatives de connexion. Réessayez dans :seconds secondes.',
    'password_requirements' => 'Le mot de passe doit contenir au moins 8 caractères et être propre à ce site.',
    '2fa_must_be_enabled' => 'L’administrateur exige l’activation de l’authentification à deux facteurs sur votre compte pour utiliser le panel.',
    'registration_disabled' => 'La création de comptes par les utilisateurs est actuellement désactivée.',
];
