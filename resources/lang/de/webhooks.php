<?php

return [
    'heading' => 'Webhooks', 'help' => 'Ausgewählte Panel-Ereignisse an Ihre Dienste senden',
    'name' => 'Name', 'format' => 'Format', 'url' => 'Webhook-URL', 'secret' => 'JSON-Signaturschlüssel',
    'keep_url' => 'Verschlüsselt gespeichert — zum Beibehalten leer lassen', 'keep_secret' => 'Leer lassen, um den Schlüssel beizubehalten',
    'url_help' => 'Nur öffentliche HTTPS-Ziele auf Port 443. Discord-URLs dürfen thread_id enthalten. URLs werden verschlüsselt gespeichert und nie angezeigt.',
    'secret_help' => 'Für JSON einen zufälligen Schlüssel mit mindestens 32 Zeichen auch beim Empfänger konfigurieren. Discord benötigt keinen Signaturschlüssel.',
    'privacy' => 'Systemereignisse enthalten Aktionen, interne IDs und Routenvorlagen. Anfrageinhalte, Zugangsdaten, Konsolenbefehle, E-Mail- und IP-Adressen werden ausgeschlossen. Statusmeldungen enthalten Ihre veröffentlichten Bezeichnungen und Vorfalltexte.',
    'delivery_help' => 'Zustellung über die Warteschlange low und den Scheduler. Netzwerkfehler, HTTP 429 und Serverfehler werden bis zu fünfmal innerhalb von 24 Stunden versucht. Verlauf: 30 Tage. Tests verwenden die gespeicherte Konfiguration.',
    'endpoints' => 'Ziele', 'add' => 'Ziel hinzufügen', 'empty' => 'Keine Webhook-Ziele konfiguriert.', 'events' => 'Ereignisauswahl',
    'groups' => ['system' => 'Systemaktionen', 'status_health' => 'Verfügbarkeitsänderungen', 'status_incident' => 'Vorfallmeldungen', 'updates_available' => 'Verfügbare Updates', 'updates_installed' => 'Erkannte Versionsänderungen'],
    'test' => 'Gespeicherten Webhook testen', 'delete' => 'Ziel und Verlauf löschen', 'history' => 'Letzte Zustellungen', 'no_history' => 'Noch keine Zustellungen.', 'attempts' => 'Versuche: :count / 5', 'retry' => 'Fehlgeschlagene Zustellung wiederholen',
    'states' => ['pending' => 'Ausstehend', 'sending' => 'Wird gesendet', 'succeeded' => 'Zugestellt', 'failed' => 'Fehlgeschlagen', 'cancelled' => 'Abgebrochen'],
    'endpoint_limit' => 'Maximal 20 Webhook-Ziele sind möglich.', 'enable_first' => 'Aktivieren und speichern Sie das Ziel vor dem Test.', 'retry_unavailable' => 'Nur fehlgeschlagene Zustellungen an ein aktives, unverändertes Ziel können wiederholt werden.',
    'url_invalid' => 'Eine unterstützte HTTPS-URL auf Port 443 ohne Zugangsdaten oder Fragment eingeben.', 'secret_required' => 'JSON-Webhooks benötigen einen Schlüssel mit mindestens 32 Zeichen.', 'saved' => 'Webhook-Einstellungen gespeichert. Zustellungen erfolgen im Hintergrund.',
    'updates' => 'Updates', 'updates_help' => 'Panel- und Daemon-Versionen und Versionshinweise',
    'check_help' => 'Prüfungen kontaktieren die offiziellen GitHub-Repositories und Ihre Nodes. Automatische stündliche Prüfungen sind optional. Diese Seite installiert keine Updates. Benachrichtigungen im Webhooks-Tab konfigurieren.',
    'comparison_help' => 'Stabile Versionen wie 1.2.3 werden verglichen. Canary-, Entwicklungs- und angepasste Versionen sind nicht zuverlässig vergleichbar. Die erste Prüfung legt den Ausgangswert fest; spätere Versionsänderungen können Benachrichtigungen auslösen.',
    'check_configuration' => 'Update-Prüfungen', 'automatic' => 'Automatische stündliche Prüfungen', 'product_help' => 'Den Daemon auswählen, falls die Erkennung Ihren Manta-Build nicht erkennt. Eine Änderung dieser Auswahl allein meldet keine Installation.',
    'auto' => 'Automatisch erkennen', 'versions' => 'Erkannte Versionen', 'check_now' => 'Prüfung einreihen', 'installed' => 'Installiert', 'latest' => 'Neueste stabile Version', 'no_release' => 'Keine stabile Version veröffentlicht', 'available' => 'Update verfügbar', 'checked' => 'Zuletzt geprüft', 'releases' => 'Versionen ansehen', 'not_checked' => 'Noch nicht geprüft. Eine Prüfung einreihen, um die Version abzurufen.',
    'invalid_nodes' => 'Nur vorhandene Nodes auswählen.', 'updates_saved' => 'Einstellungen gespeichert oder Prüfung eingereiht. Ergebnisse erscheinen nach Verarbeitung des Auftrags.', 'update_notes' => 'Update-Hinweise', 'latest_notes' => 'Neueste Versionshinweise', 'no_notes' => 'Für diese Version ist keine GitHub-Release-Beschreibung verfügbar.',
    'notes_help' => 'Die Hinweise passen zur installierten Version: Canary-Builds verwenden das Canary-Release; versionierte Builds das passende Release-Tag. Zum Aktualisieren eine Prüfung einreihen oder automatische stündliche Prüfungen aktivieren.',
];
