# Sichtbare NOCT-Locations

Ab 22.10.2026 ist `lib/locations.ts` die vollständige Positivliste für die sichtbare App:
808 Nachtklub, AMANO Rooftop am Berliner Hauptbahnhof (Grand Central Rooftop), BRICKS Club, Weekend Club, Berghain und Klunkerkranich.

Lido, Heimathafen Neukölln, Fahimi Bar und ://about blank wurden bereits beim Entfernen der früheren Demo-Events aus der aktiven Datenquelle entfernt. Die damaligen fiktiven Berghain-/Klunkerkranich-Veranstaltungen bleiben gelöscht; beide Orte werden ausschließlich als reale Locations wieder aufgenommen. Es werden keine Preise, Zeiten, Genres oder Ersatzveranstaltungen aus dem Ort abgeleitet.

Der Katalog steuert Marker, WebGL-Ausfallansicht, Locationkarten, Details, Tourziele, Eventvalidierung und die Bereinigung gespeicherter Location-IDs. Empfehlungen und Filter verwerfen unbekannte Location-IDs zusätzlich an ihrer gemeinsamen Grenze. Die bisherige Reihenfolge der vier Tourziele bleibt erhalten; Berghain und Klunkerkranich folgen danach. Flugzeiten, Perspektiven, Shader, Dächer und Fensterbeleuchtung werden nicht verändert.

Die Importpipeline berücksichtigt die sechs Katalogeinträge. Alle automatischen Quellen bleiben deaktiviert, bis Nutzungsrechte, Robots-Regeln und Live-Abrufe geklärt sind. Der öffentliche Standard-Snapshot bleibt leer. Manuell geprüfte echte Eventdaten und die vier persönlichen Clubfotos liegen ausschließlich im privaten Entwicklungs-Build.

Quellen für die ergänzten Orte:
- Berghain: https://www.berghain.berlin/de/program/; Standort Am Wriezener Bahnhof, 10243 Berlin. Bestehende OSM-Ortsreferenz node/6341225967.
- Klunkerkranich: https://klunkerkranich.org/ und https://klunkerkranich.org/events/; Karl-Marx-Straße 66, 12043 Berlin. Bestehende OSM-Ortsreferenz node/2941462114.

Die hervorgehobene Kartenanzeige verwendet dieselben vier privaten Location-Fotos wie die bestehenden Event-/Locationkarten. Ein kompakter Fotoausschnitt mit dunklem Textverlauf erscheint bereits beim Anflug. Bildausfall und die beiden Orte ohne Foto verwenden den neutralen Namens-Fallback. Nur aktuelle/nächste Tourfotos werden über den normalen Browsercache vorgewärmt; kein zusätzlicher Datendienst und keine veränderte Flugsteuerung.

Zwei zusätzliche Termine wurden am 22.10.2026 direkt auf offiziellen Eventseiten geprüft und nur der privaten Auswahl hinzugefügt:
- Berghain, Klubnacht, 24.10.2026 23:59: https://www.berghain.berlin/de/event/80748/. Preis/Ende/Gesamtgenre nicht angenommen.
- Klunkerkranich, Soul Explosion, 24.10.2026 16:00 bis 25.10.2026 01:00: https://klunkerkranich.org/events/2026-10-24-soul-explosion-x-klunkerkranich-w-dj-king-dynamite/. Explizite Funk-/Boogaloo-Angaben; die zeitabhängige Eintrittsspanne5–9Euro wird nicht in einen erfundenen Einzelpreis umgewandelt. Das bestehende Einzelfeld bleibt unbekannt; maßgeblich ist die Quelle.

Die vorhandenen vier echten Weekend-/BRICKS-Datensätze bleiben mit ihren ursprünglichen Prüfzeiten erhalten. Ohne erneute Quellenprüfung läuft jeder Eintrag nach48Stunden aus. Dies ist weiterhin eine begrenzte manuell geprüfte Auswahl, kein vollständiger oder automatisch täglich synchronisierter Kalender.
