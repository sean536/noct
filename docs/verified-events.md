# Verifizierte Veranstaltungen – Betriebsstand

Stand: 21.10.2026. Keine aktiven Demo-Events mehr. Die vier Locations sind unabhängig von Veranstaltungen in `lib/locations.ts` gespeichert. Ihre Tour und Fotokarten funktionieren auch bei leerem Kalender. Es werden keine Veranstaltungen aus Öffnungszeiten, Genre-Vermutungen oder regelmäßigen Partyreihen erzeugt.

## Quellen und Recherche

- 808: https://808.berlin/ – Kalender gefunden, bei den recherchierten kommenden Einträgen aber keine eindeutig belegte Anfangszeit. Keine übernommenen Veranstaltungen.
- BRICKS: https://www.bricks-berlin.club/events-guestlist – ein vollständig datierter kommender Eintrag geprüft. Unbekanntes Genre, Ende und Eintritt bleiben unbekannt.
- AMANO Hauptbahnhof: https://www.amanogroup.com/de/bars/grand-central-rooftop-bar-berlin-hauptbahnhof – meldet keine geplanten Events. Bar-Öffnungszeiten sind keine Veranstaltungen.
- Weekend: https://www.weekendclub.berlin/upcoming – drei kommende, einzeln datierte Veranstaltungen auf offiziellen Detailseiten geprüft.

Die vier manuell geprüften Datensätze befinden sich ausschließlich im owner-privaten Entwicklungs-Build, nicht in diesem öffentlichen Repository. Jeder enthält die konkrete Quellen- und offizielle Veranstaltungs-URL sowie den ursprünglichen Prüfzeitpunkt. Der öffentliche Standard-Snapshot `public/verified-events.json` bleibt leer. Die privaten Clubfotos bleiben ebenfalls außerhalb von Git; siehe `ui/private-location-photos.md`.

**Keine pauschale Erlaubnis für kommerzielles Scraping nachgewiesen.** Das Weekend-Impressum (https://www.weekendclub.berlin/imprint) beschränkt Kopien/Downloads auf privaten, nicht kommerziellen Gebrauch. Die private manuelle Auswahl ist keine Erlaubnis für einen öffentlichen kommerziellen Kalender. Robots-Dateien konnten mit den verfügbaren Recherchewerkzeugen nicht geprüft werden. Direkte HTTP-Aufrufe wurden durch den Entwicklungs-Proxy blockiert; das beweist keine Sperre oder Störung der Club-Websites. Keine Zugriffsbeschränkung wird umgangen.

## Implementierte Pipeline

`lib/event-ingestion.ts` liest ausschließlich ausdrücklich deklarierte Schema.org Event/MusicEvent-JSON-LD-Felder. HTML-Fließtext, Veranstaltungsnamen, Öffnungszeiten und Beschreibungen werden nicht in Termine/Genres/Preise umgedeutet. Für derzeit unstrukturierte Clubkalender bleibt die dokumentierte manuelle Prüfung erforderlich; der Adapter verspricht keine Vollständigkeit dieser Quellen.

- Quellen sind pro Location auf deren offizielle HTTPS-Domain begrenzt; keine automatischen Redirects, fremden Ticketanbieter oder beliebigen URLs.
- Abruf erst nach `enabled` **und** `rightsReviewed` im Source-Registry. Alle vier sind derzeit `false`.
- Robots-Prüfung vor jedem Kalenderabruf. Fehler, unbekannte Richtlinien und Crawl-delay führen zu manueller Prüfung. Begrenzte Antwortgröße, Timeout und sequentielle Anfragen; kein Bulk-Download oder persistenter Scraping-Cache.
- Eindeutige deterministische IDs; Titel, exakte Startzeit mit Zeitzone, Quelle und Prüfzeit sind Pflicht. Nur explizit bestätigte Zusatzfelder. Eintrittspreise ausschließlich mit explizitem EUR-Angebot, nie als Schätzung oder Mindestpreis. Unbekannt ist `null`, nicht null Euro.
- Gemeinsamer Validator für Import und Browser; Ortsname/Koordinaten aus dem Locationkatalog. Ungültige, abgesagte, vergangene und über 48 Stunden nicht neu geprüfte Einträge werden verworfen. Dubletten werden zusammengeführt; widersprüchliche gleichzeitig geprüfte Fakten werden gesperrt.
- Aktuelle Empfehlungen enden vorsichtshalber bereits zum Veranstaltungsbeginn; eine unbekannte Veranstaltungsdauer wird nicht geschätzt.
- Browser lädt den Snapshot beim Öffnen und alle 15 Minuten neu, prüft Ablauf/Staleness minütlich sowie bei Fokus/Rückkehr. Ausfälle ergeben keine alten Ersatzdaten. Bereits gestartete Veranstaltungen können dadurch höchstens bis zur nächsten Minutenprüfung sichtbar bleiben; beim Öffnen prüft der Callback die Gültigkeit erneut.
- Alte Demo-Favoriten werden entfernt; gültige Location-Favoriten bleiben auch ohne Events erhalten.

## Bedienung ohne laufenden Scheduler

```sh
# Schreibt aktuell einen leeren Report; alle Quellen deaktiviert, kein Netzwerkzugriff.
npm run events:refresh -- /absoluter/externer/pfad/snapshot.json
# Strenge Prüfung einer manuell überprüften Auswahl; keine neue Prüfung vortäuschen.
npm run events:validate -- /externer/pfad/reviewed.json /externer/pfad/validated.json
```

Ausgabeverzeichnis muss bereits existieren und außerhalb des öffentlichen Checkouts liegen. Symlink-Ausgaben sind verboten. Ein ungültiger, doppelter oder veralteter manueller Datensatz bricht den Validierungslauf ohne Ausgabe ab. Prüfzeiten werden beim Validieren/Build nicht erneuert. Testfixtures in `tests/` sind ausdrücklich synthetisch, werden nie vom App-Code importiert und nie als Ersatzveranstaltungen ausgeliefert.

## Tägliche Aktualisierung: vorbereitet, NICHT aktiv

Es gibt **keinen** neu angelegten Cronjob, keine aktive GitHub-Action, keine Sites-Schedule und keinen automatischen Publish. Browser-Polling aktualisiert nur den gelieferten Snapshot und prüft keine Clubkalender. Die Testauswahl läuft ohne neue Recherche nach 48 Stunden aus; dann erscheint „Aktuell keine bestätigten Events gefunden.“.

Vor Aktivierung sind erforderlich:

1. Freigabe zulässiger Nutzung je Anbieter und prüfbarer Robots-Regeln; bei Bedarf offizieller Feed/Partnerschaft.
2. Tatsächlichen strukturierten Feed im erlaubten Netzwerk prüfen und Adapter je Quelle testen. Nicht strukturierte Quellen nur manuell prüfen, bis eine belastbare Integration existiert.
3. Sean genehmigt einen täglichen Runner. Er führt `events:refresh` einmal täglich aus, protokolliert Exit/Quellenstatus und tauscht den Snapshot atomar gegen das vollständige neue Resultat (auch eine leere Datei bei Quellenausfällen) aus. Keine zurückbehaltenen Ersatzveranstaltungen.
4. Privates Publizieren auf genau der bestehenden Entwicklungswebsite, deren Owner-Zugriff vorher prüfen. Kein automatischer Merge, keine Veröffentlichung auf der ursprünglichen Website. Ein öffentlicher kommerzieller Kalender erfordert gesonderte Quellen- und Bildfreigaben.

Es wurden keine kostenpflichtigen APIs, Konten, Secrets oder neuen Berechtigungen eingerichtet.

### Fortsetzung 22.10.2026 – Weekend-Adapter

Der Job kann zusätzlich die **tatsächlich im offiziellen Weekend-Kalender verlinkten ICS-Dateien** lesen (höchstens sechs je Lauf). Er erfindet keine Feed-URL. Jeder Feed muss Robots erlauben, auf der offiziellen Domain liegen und eine Veranstaltung im Weekend Club an der Alexanderstraße 7 beschreiben. UTC und eindeutige `Europe/Berlin`-Zeiten werden unterstützt; fehlende Zeitzonen, ganztägige Daten, Sommerzeit-Lücken/-Mehrdeutigkeiten, Wiederholungsregeln, private und abgesagte Einträge werden verworfen. Keine Preisableitung aus Beschreibungen. Importiert werden ausschließlich bestätigte Kalenderfelder, dedupliziert durch das gemeinsame Schema.

Fünf Parser-/Jobtests prüfen diese Grenzen mit ausdrücklich synthetischen, ausschließlich testinternen ICS-Fixtures. **Kein erfolgreicher automatischer Live-Abruf behauptet:** Der Rechercheconnector kann die angebotenen ICS-Links nicht auslesen; direkte Club-HTTP-Abrufe sind im verwalteten Entwicklungsnetz nicht freigeschaltet. Rechte-/Robots-Prüfung bleibt vor Aktivierung erforderlich.

### Quellenspezifische Prüfungen für die übrigen Clubs

`lib/event-sources.ts` führt für jede der vier Locations einen expliziten Adapter und den datierten Recherche-/Blockerstatus. 808, BRICKS und AMANO verwenden den gemeinsamen strengen JSON-LD-Adapter; Weekend ergänzt verlinkte ICS. Die gemeinsame Implementierung ist beabsichtigt, keine vier verschiedenen Datenbanken.

Die Clubtests prüfen: BRICKS mit vollständig angegebenem Datum übernimmt nur bestätigte Fakten; 808-Datumslisten ohne Beginn erzeugen nichts; AMANO-Öffnungszeiten, Getränkepreise und gleichnamige Häuser in anderen Städten erzeugen nichts. Bei einer ausgefallenen Quelle können ausschließlich gültige Datensätze anderer Quellen bleiben. Die beobachteten Originalseiten sind damit nicht als funktionierende JSON-LD-Feeds freigegeben: Live-Übernahme aller vier Quellen ist weiterhin nicht nachgewiesen.

Am 22.10.2026 wurden die zuvor vier manuell erfassten Termine erneut direkt auf den offiziellen Seiten geprüft und mit unveränderten tatsächlichen Eventdaten durch `events:validate` importiert. Die Ausgabe enthält vier gültige Datensätze. 808/AMANO haben null Veranstaltungen; alle vier Locations bleiben sichtbar. Die privaten Quelldatensätze werden nicht öffentlich eingecheckt. Diese gezielte Auswahl ist kein Anspruch auf einen vollständigen Clubkalender.
