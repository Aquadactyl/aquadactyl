<?php

return [
    'validation' => [
        'fqdn_not_resolvable' => 'Le FQDN ou l’adresse IP fourni ne se résout pas en une adresse IP valide.',
        'fqdn_required_for_ssl' => 'Un nom de domaine complet se résolvant en une adresse IP publique est nécessaire pour utiliser SSL sur ce nœud.',
    ],
    'notices' => [
        'allocations_added' => 'Les allocations ont été ajoutées à ce nœud.',
        'node_deleted' => 'Le nœud a été supprimé du panel.',
        'location_required' => 'Configurez au moins un emplacement avant d’ajouter un nœud à ce panel.',
        'node_created' => 'Le nœud a été créé. L’onglet « Configuration » permet de configurer automatiquement le daemon sur cette machine. Attribuez au moins une adresse IP et un port avant d’ajouter des serveurs.',
        'node_updated' => 'Les informations du nœud ont été mises à jour. Si des paramètres du daemon ont changé, redémarrez-le pour les appliquer.',
        'unallocated_deleted' => 'Tous les ports non attribués de <code>:ip</code> ont été supprimés.',
    ],
];
