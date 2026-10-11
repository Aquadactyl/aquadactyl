<?php

return [
    'exceptions' => [
        'no_new_default_allocation' => 'Sie versuchen, die primäre Zuweisung dieses Servers zu löschen, es ist jedoch keine Ersatzzuweisung verfügbar.',
        'marked_as_failed' => 'Die letzte Installation dieses Servers wurde als fehlgeschlagen markiert. Der aktuelle Status kann in diesem Zustand nicht umgeschaltet werden.',
        'skipping_install_script' => 'Dieser Server überspringt das Installationsskript seines Eggs. Eine Neuinstallation ist erst möglich, wenn diese Einstellung deaktiviert wird.',
        'bad_variable' => 'Bei der Variable :name ist ein Validierungsfehler aufgetreten.',
        'daemon_exception' => 'Bei der Kommunikation mit dem Daemon ist ein Fehler mit dem HTTP-Antwortcode :code aufgetreten. Dieser Fehler wurde protokolliert. (Anfrage-ID: :request_id)',
        'default_allocation_not_found' => 'Die angeforderte primäre Zuweisung wurde unter den Zuweisungen dieses Servers nicht gefunden.',
    ],
    'alerts' => [
        'startup_changed' => 'Die Startkonfiguration dieses Servers wurde aktualisiert. Wenn das Nest oder Egg geändert wurde, beginnt jetzt eine Neuinstallation.',
        'server_deleted' => 'Der Server wurde erfolgreich aus dem System gelöscht.',
        'server_created' => 'Der Server wurde erfolgreich im Panel erstellt. Geben Sie dem Daemon einige Minuten, um die Installation abzuschließen.',
        'build_updated' => 'Die Ressourceneinstellungen dieses Servers wurden aktualisiert. Einige Änderungen erfordern einen Neustart.',
        'suspension_toggled' => 'Der Sperrstatus des Servers wurde auf :status geändert.',
        'rebuild_on_boot' => 'Der Docker-Container dieses Servers wurde für einen Neuaufbau markiert. Dieser erfolgt beim nächsten Serverstart.',
        'install_toggled' => 'Der Installationsstatus dieses Servers wurde umgeschaltet.',
        'server_reinstalled' => 'Der Server wurde für eine jetzt beginnende Neuinstallation eingereiht.',
        'details_updated' => 'Die Serverinformationen wurden erfolgreich aktualisiert.',
        'docker_image_updated' => 'Das Standard-Docker-Image dieses Servers wurde geändert. Ein Neustart ist erforderlich, um die Änderung anzuwenden.',
        'node_required' => 'Sie müssen mindestens einen Knoten konfigurieren, bevor Sie diesem Panel einen Server hinzufügen können.',
        'transfer_nodes_required' => 'Sie müssen mindestens zwei Knoten konfigurieren, bevor Sie Server übertragen können.',
        'transfer_started' => 'Die Serverübertragung wurde gestartet.',
        'transfer_not_viable' => 'Der ausgewählte Knoten verfügt nicht über ausreichend Speicherplatz oder Arbeitsspeicher für diesen Server.',
    ],
];
