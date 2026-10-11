<?php

return [
    'notices' => [
        'created' => 'Ein neues Nest namens :name wurde erfolgreich erstellt.',
        'deleted' => 'Das angeforderte Nest wurde erfolgreich aus dem Panel gelöscht.',
        'updated' => 'Die Einstellungen des Nests wurden erfolgreich aktualisiert.',
    ],
    'eggs' => [
        'notices' => [
            'imported' => 'Dieses Egg und seine Variablen wurden erfolgreich importiert.',
            'updated_via_import' => 'Dieses Egg wurde anhand der angegebenen Datei aktualisiert.',
            'deleted' => 'Das angeforderte Egg wurde erfolgreich aus dem Panel gelöscht.',
            'updated' => 'Die Egg-Konfiguration wurde erfolgreich aktualisiert.',
            'script_updated' => 'Das Installationsskript des Eggs wurde aktualisiert und wird bei Serverinstallationen ausgeführt.',
            'egg_created' => 'Ein neues Egg wurde erfolgreich erstellt. Starten Sie alle laufenden Daemons neu, um dieses Egg anzuwenden.',
        ],
    ],
    'variables' => [
        'notices' => [
            'variable_deleted' => 'Die Variable „:variable“ wurde gelöscht und steht den Servern nach dem Neuaufbau nicht mehr zur Verfügung.',
            'variable_updated' => 'Die Variable „:variable“ wurde aktualisiert. Bauen Sie die Server, die diese Variable verwenden, neu auf, um die Änderungen anzuwenden.',
            'variable_created' => 'Eine neue Variable wurde erfolgreich erstellt und diesem Egg zugewiesen.',
        ],
    ],
];
