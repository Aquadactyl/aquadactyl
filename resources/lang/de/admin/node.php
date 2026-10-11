<?php

return [
    'validation' => [
        'fqdn_not_resolvable' => 'Der angegebene FQDN oder die IP-Adresse lässt sich nicht zu einer gültigen IP-Adresse auflösen.',
        'fqdn_required_for_ssl' => 'Zur Verwendung von SSL für diesen Knoten ist ein vollständig qualifizierter Domainname erforderlich, der auf eine öffentliche IP-Adresse verweist.',
    ],
    'notices' => [
        'allocations_added' => 'Die Zuweisungen wurden diesem Knoten erfolgreich hinzugefügt.',
        'node_deleted' => 'Der Knoten wurde erfolgreich aus dem Panel entfernt.',
        'location_required' => 'Sie müssen mindestens einen Standort konfigurieren, bevor Sie diesem Panel einen Knoten hinzufügen können.',
        'node_created' => 'Ein neuer Knoten wurde erfolgreich erstellt. Im Tab „Konfiguration“ können Sie den Daemon auf diesem Rechner automatisch konfigurieren. Bevor Sie Server hinzufügen, müssen Sie mindestens eine IP-Adresse und einen Port zuweisen.',
        'node_updated' => 'Die Knoteninformationen wurden aktualisiert. Wenn Daemon-Einstellungen geändert wurden, müssen Sie den Daemon neu starten, damit die Änderungen wirksam werden.',
        'unallocated_deleted' => 'Alle nicht zugewiesenen Ports für <code>:ip</code> wurden gelöscht.',
    ],
];
