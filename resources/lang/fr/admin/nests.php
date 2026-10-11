<?php

return [
    'notices' => [
        'created' => 'Le Nest :name a été créé avec succès.',
        'deleted' => 'Le Nest demandé a été supprimé du panel.',
        'updated' => 'La configuration du Nest a été mise à jour.',
    ],
    'eggs' => [
        'notices' => [
            'imported' => 'Cet Egg et ses variables ont été importés avec succès.',
            'updated_via_import' => 'Cet Egg a été mis à jour à partir du fichier fourni.',
            'deleted' => 'L’Egg demandé a été supprimé du panel.',
            'updated' => 'La configuration de l’Egg a été mise à jour.',
            'script_updated' => 'Le script d’installation de l’Egg a été mis à jour et sera exécuté lors de l’installation des serveurs.',
            'egg_created' => 'Un nouvel Egg a été créé. Redémarrez les daemons en cours d’exécution pour l’appliquer.',
        ],
    ],
    'variables' => [
        'notices' => [
            'variable_deleted' => 'La variable « :variable » a été supprimée et ne sera plus disponible pour les serveurs après leur reconstruction.',
            'variable_updated' => 'La variable « :variable » a été mise à jour. Reconstruisez les serveurs qui l’utilisent pour appliquer les changements.',
            'variable_created' => 'La variable a été créée et attribuée à cet Egg.',
        ],
    ],
];
