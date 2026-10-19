<?php

return [
    'heading' => 'Webhooks', 'help' => 'Envoyer les événements sélectionnés à vos services',
    'name' => 'Nom', 'format' => 'Format', 'url' => 'URL du webhook', 'secret' => 'Secret de signature JSON',
    'keep_url' => 'Enregistrée et chiffrée — laisser vide pour conserver', 'keep_secret' => 'Laisser vide pour conserver le secret',
    'url_help' => 'Destinations HTTPS publiques sur le port 443 uniquement. Les URL Discord acceptent thread_id. Les URL sont chiffrées et ne sont jamais affichées.',
    'secret_help' => 'Pour JSON, indiquez un secret aléatoire de 32 caractères minimum et configurez-le sur le service destinataire. Discord ne nécessite pas de secret.',
    'privacy' => 'Les événements système incluent les actions, les identifiants internes et les modèles de routes. Ils excluent les requêtes, les secrets, les commandes, les courriels et les adresses IP. Les notifications de statut incluent vos libellés publics et les messages des incidents.',
    'delivery_help' => 'Les envois utilisent la file low et le planificateur. Les erreurs réseau, HTTP 429 et serveur sont réessayées jusqu’à cinq fois en 24 heures. Historique conservé 30 jours. Les tests utilisent la configuration enregistrée.',
    'endpoints' => 'Destinations', 'add' => 'Ajouter une destination', 'empty' => 'Aucune destination configurée.', 'events' => 'Événements suivis',
    'groups' => ['system' => 'Actions système', 'status_health' => 'Changements de disponibilité', 'status_incident' => 'Mises à jour des incidents', 'updates_available' => 'Mises à jour disponibles', 'updates_installed' => 'Changements de version détectés'],
    'test' => 'Tester le webhook enregistré', 'delete' => 'Supprimer la destination et son historique', 'history' => 'Envois récents', 'no_history' => 'Aucun envoi.', 'attempts' => 'Tentatives : :count / 5', 'retry' => 'Réessayer un envoi échoué',
    'states' => ['pending' => 'En attente', 'sending' => 'Envoi en cours', 'succeeded' => 'Envoyé', 'failed' => 'Échec', 'cancelled' => 'Annulé'],
    'endpoint_limit' => 'Vous pouvez configurer 20 destinations maximum.', 'enable_first' => 'Activez et enregistrez la destination avant de la tester.', 'retry_unavailable' => 'Seuls les envois échoués vers une destination active et inchangée peuvent être réessayés.',
    'url_invalid' => 'Indiquez une URL HTTPS prise en charge sur le port 443, sans identifiants ni fragment.', 'secret_required' => 'Les webhooks JSON nécessitent un secret de 32 caractères minimum.', 'saved' => 'Configuration enregistrée. Les envois sont traités en arrière-plan.',
    'updates' => 'Mises à jour', 'updates_help' => 'Versions du panel et des daemons et notes de version',
    'check_help' => 'Les vérifications contactent les dépôts GitHub officiels et vos nœuds. Les vérifications automatiques sont facultatives et horaires. Cette page n’installe pas de mises à jour. Configurez les notifications dans Webhooks.',
    'comparison_help' => 'Les versions stables comme 1.2.3 sont comparées. Les versions canary, de développement et personnalisées ne peuvent pas être comparées de manière fiable. La première vérification établit une référence ; les changements suivants peuvent déclencher une notification.',
    'check_configuration' => 'Vérifications des mises à jour', 'automatic' => 'Vérifications horaires automatiques', 'product_help' => 'Choisissez le daemon si la détection automatique ne reconnaît pas votre version de Manta. Modifier ce choix seul ne signale pas une installation.',
    'auto' => 'Détection automatique', 'versions' => 'Versions observées', 'check_now' => 'Planifier une vérification', 'installed' => 'Installée', 'latest' => 'Dernière version stable', 'no_release' => 'Aucune version stable publiée', 'available' => 'Mise à jour disponible', 'checked' => 'Dernière vérification', 'releases' => 'Voir les versions', 'not_checked' => 'Pas encore vérifiée. Planifiez une vérification pour récupérer la version.',
    'invalid_nodes' => 'Sélectionnez uniquement des nœuds existants.', 'updates_saved' => 'Configuration enregistrée ou vérification planifiée. Les résultats apparaîtront après traitement de la tâche.', 'installed_notes' => 'Notes de la version installée', 'latest_notes' => 'Notes de la dernière version', 'no_notes' => 'Aucune note fournie pour cette version.',
];
