<?php

return [
    'exceptions' => [
        'no_new_default_allocation' => 'Vous tentez de supprimer l’allocation principale de ce serveur, mais aucune allocation de remplacement n’est disponible.',
        'marked_as_failed' => 'Ce serveur a été marqué comme ayant échoué lors d’une installation précédente. Son état ne peut pas être modifié dans cette situation.',
        'skipping_install_script' => 'Ce serveur est configuré pour ignorer le script d’installation de son Egg. Désactivez ce paramètre pour permettre la réinstallation.',
        'bad_variable' => 'Une erreur de validation est survenue pour la variable :name.',
        'daemon_exception' => 'Une erreur de communication avec le daemon a entraîné une réponse HTTP/:code. Cette erreur a été enregistrée. (identifiant de requête : :request_id)',
        'default_allocation_not_found' => 'L’allocation principale demandée n’a pas été trouvée parmi les allocations de ce serveur.',
    ],
    'alerts' => [
        'startup_changed' => 'La configuration de démarrage a été mise à jour. Si le Nest ou l’Egg du serveur a changé, une réinstallation va commencer.',
        'server_deleted' => 'Le serveur a été supprimé du système.',
        'server_created' => 'Le serveur a été créé dans le panel. Laissez quelques minutes au daemon pour terminer son installation.',
        'build_updated' => 'Les paramètres de ressources du serveur ont été mis à jour. Certains changements nécessitent un redémarrage.',
        'suspension_toggled' => 'L’état de suspension du serveur est désormais :status.',
        'rebuild_on_boot' => 'Le conteneur Docker de ce serveur doit être reconstruit. Cela aura lieu au prochain démarrage du serveur.',
        'install_toggled' => 'L’état d’installation du serveur a été modifié.',
        'server_reinstalled' => 'La réinstallation du serveur a été ajoutée à la file d’attente et va commencer.',
        'details_updated' => 'Les informations du serveur ont été mises à jour.',
        'docker_image_updated' => 'L’image Docker par défaut de ce serveur a été modifiée. Un redémarrage est nécessaire pour appliquer ce changement.',
        'node_required' => 'Configurez au moins un nœud avant d’ajouter un serveur à ce panel.',
        'transfer_nodes_required' => 'Configurez au moins deux nœuds avant de transférer des serveurs.',
        'transfer_started' => 'Le transfert du serveur a commencé.',
        'transfer_not_viable' => 'Le nœud sélectionné ne dispose pas de suffisamment d’espace disque ou de mémoire pour accueillir ce serveur.',
    ],
];
