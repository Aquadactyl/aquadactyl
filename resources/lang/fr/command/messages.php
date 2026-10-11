<?php

return [
    'location' => [
        'no_location_found' => 'Aucun emplacement ne correspond au code court fourni.',
        'ask_short' => 'Code court de l’emplacement',
        'ask_long' => 'Description de l’emplacement',
        'created' => 'L’emplacement :name a été créé avec l’identifiant :id.',
        'deleted' => 'L’emplacement demandé a été supprimé.',
    ],
    'user' => [
        'search_users' => 'Saisissez un nom d’utilisateur, un identifiant ou une adresse e-mail',
        'select_search_user' => 'Identifiant de l’utilisateur à supprimer (saisissez « 0 » pour relancer la recherche)',
        'deleted' => 'L’utilisateur a été supprimé du panel.',
        'confirm_delete' => 'Voulez-vous vraiment supprimer cet utilisateur du panel ?',
        'no_users_found' => 'Aucun utilisateur ne correspond au terme de recherche.',
        'multiple_found' => 'Plusieurs comptes correspondent à l’utilisateur fourni. La suppression est impossible avec l’option --no-interaction.',
        'ask_admin' => 'Cet utilisateur est-il administrateur ?',
        'ask_email' => 'Adresse e-mail',
        'ask_username' => 'Nom d’utilisateur',
        'ask_name_first' => 'Prénom',
        'ask_name_last' => 'Nom',
        'ask_password' => 'Mot de passe',
        'ask_password_tip' => 'Pour créer un compte avec un mot de passe aléatoire envoyé par e-mail à l’utilisateur, relancez cette commande (CTRL+C) avec l’option --no-password.',
        'ask_password_help' => 'Les mots de passe doivent contenir au moins 8 caractères, dont une majuscule et un chiffre.',
        '2fa_help_text' => [
            'Cette commande désactive l’authentification à deux facteurs du compte utilisateur si elle est activée. Utilisez-la uniquement pour récupérer un compte auquel l’utilisateur ne peut plus accéder.',
            'Si ce n’est pas ce que vous souhaitez, appuyez sur CTRL+C pour quitter.',
        ],
        '2fa_disabled' => 'L’authentification à deux facteurs a été désactivée pour :email.',
    ],
    'schedule' => [
        'output_line' => 'Envoi du traitement pour la première tâche de « :schedule » (:hash).',
    ],
    'maintenance' => [
        'deleting_service_backup' => 'Suppression du fichier de sauvegarde du service :file.',
    ],
    'server' => [
        'rebuild_failed' => 'La reconstruction de « :name » (n° :id) sur le nœud « :node » a échoué : :message',
        'reinstall' => [
            'failed' => 'La réinstallation de « :name » (n° :id) sur le nœud « :node » a échoué : :message',
            'confirm' => 'Vous allez réinstaller un groupe de serveurs. Voulez-vous continuer ?',
        ],
        'power' => [
            'confirm' => 'Vous allez effectuer l’action :action sur :count serveurs. Voulez-vous continuer ?',
            'action_failed' => 'L’action d’alimentation sur « :name » (n° :id) du nœud « :node » a échoué : :message',
        ],
    ],
    'environment' => [
        'mail' => [
            'ask_smtp_host' => 'Hôte SMTP (ex. smtp.gmail.com)',
            'ask_smtp_port' => 'Port SMTP',
            'ask_smtp_username' => 'Nom d’utilisateur SMTP',
            'ask_smtp_password' => 'Mot de passe SMTP',
            'ask_mailgun_domain' => 'Domaine Mailgun',
            'ask_mailgun_endpoint' => 'Point d’accès Mailgun',
            'ask_mailgun_secret' => 'Clé secrète Mailgun',
            'ask_mandrill_secret' => 'Clé secrète Mandrill',
            'ask_postmark_username' => 'Clé API Postmark',
            'ask_driver' => 'Quel pilote utiliser pour envoyer les e-mails ?',
            'ask_mail_from' => 'Adresse e-mail de l’expéditeur',
            'ask_mail_name' => 'Nom de l’expéditeur des e-mails',
            'ask_encryption' => 'Méthode de chiffrement à utiliser',
        ],
    ],
];
