<?php

return [
    'title' => 'Application web progressive (PWA)',
    'description' => 'Choisissez si les utilisateurs peuvent installer le panel comme application et afficher une page hors ligne.',
    'enabled' => 'Installation de l’application',
    'enabled_help' => 'Publier le manifeste et les commandes d’installation du navigateur.',
    'offline' => 'Page de connexion hors ligne',
    'offline_help' => 'Conserver uniquement une page de connexion publique. Les comptes, journaux de console et fichiers des serveurs ne sont jamais conservés hors ligne. Nécessite l’activation de l’installation.',
    'on' => 'Activé',
    'off' => 'Désactivé',
    'app_name' => 'Nom de l’application',
    'name_help' => 'Facultatif. Laissez vide pour utiliser le nom du site défini dans Apparence.',
    'short_name' => 'Nom court de l’application',
    'short_help' => 'Facultatif. Jusqu’à 30 caractères pour les raccourcis ; utilise le nom de l’application par défaut.',
    'branding_help' => 'Les icônes et la couleur de l’application suivent l’identité visuelle du panel.',
    'install_help' => 'HTTPS est requis hors de localhost. Choisissez Installer l’application dans Chrome ou Edge, ou Partager → Sur l’écran d’accueil dans Safari. La gestion des serveurs nécessite une connexion.',
    'disable_help' => 'La désactivation retire les commandes d’installation et supprime le worker hors ligne et son cache lors d’une reconnexion ou d’un rechargement. Désactiver uniquement la page hors ligne conserve l’installation. Les raccourcis existants ne peuvent pas être supprimés à distance.',
    'saved' => 'Paramètres PWA enregistrés.',
];
