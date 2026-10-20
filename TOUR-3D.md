# Berlin-Tour und 3D-Daten

Bestehendes Projekt: Next16, React19, MapLibre5.20. Keine neue App, keine zusätzlichen Laufzeitpakete, keine bezahlte API. Luftbildquelle Geoportal Berlin bleibt erhalten.

## Start und Bedienung

Der Start zeigt nur „Worauf hast du heute Lust?“, Berlin-Menü, ein Eingabefeld und die sieben Chips. Quellenangaben bleiben rechtmäßig sichtbar. Keine Startkarten, Eventlisten oder Untertitel. Nach der Ankunft erscheint ein kleines anklickbares Demo-Label mit Name, Location und Uhrzeit.

Aktuell: höherer3D-Anflug bei Zoom15,35, maximal2.200ms höherer Vorbereitungsbogen, Abstieg nur nach ausreichender Bereitschaft, anschließend bewegte Eventpräsentation und direkte Weiterfahrt. Beim Lade-Fallback höher bleiben. Eine Map/Controller-Instanz, kein stationärer Rotationstimer. Details: `LIVING-CITY.md`.

Manuelle Interaktion, Eingaben, Details und Empfehlungen unterbrechen die Tour. Ohne aktive Eingaben/Panels kehrt sie nach sechs ruhigen Sekunden selbstständig zurück; kein Play-/Pause-/2D-Schalter. Hintergrundbetrieb und reduzierte Bewegung verhindern Autoplay. Ausdrückliche Auswahl springt bei Reduced Motion ohne Animation in eine3D-Ansicht. Weitere App-Funktionen und der Berlin-Datensatz bleiben erhalten.

## Gebäudequelle und Grenzen

- [OpenFreeMap](https://openfreemap.org/) liefert kostenlose, kommerziell verwendbare OpenStreetMap-Vektorkacheln ohne API-Key. Quelle `https://tiles.openfreemap.org/planet`.
- [OpenMapTiles building-Schema](https://openmaptiles.org/docs/schema/#building): reale OSM-Grundrisse, `render_height`/`render_min_height` sind aus Höhen-/Geschossangaben abgeleitete Näherungen. `hide_3d` wird beachtet. Ohne positive Höhe keine Extrusion, keine selbst erzeugten Gebäude, keine feste Ersatzhöhe.
- [Amtliches Berliner LoD2](https://daten.berlin.de/datensaetze/3d-gebaudemodelle-im-level-of-detail-2-lod-2-3c7c49af) bietet genauere Grundrisse und generalisierte Dachformen unter dl-de-zero2.0. Für diese Version nicht zur Laufzeit als große CityGML-Datei geladen; dafür wäre eine aufbereitete gekachelte Pipeline sinnvoll.
- Das [texturierte Berliner3D-Mesh](https://daten.berlin.de/datensaetze/3d-meshmodell-berlin) hat eigene Nutzungsbedingungen und wurde nicht ohne geprüfte Erlaubnis übernommen.

Das Ergebnis sind räumliche Extrusionen realer Grundrisse über echten Luftbildern; keine fotorealistischen Apple-Maps-Meshes. MapLibre texturiert die extrudierten Dächer nicht mit den darunterliegenden Orthofotos. Höhen/Geometrien sind nicht amtlich vermessen und können unvollständig sein. Die Gebäudequelle ist unabhängig vom Luftbild: bei Ausfall bleiben Luftbilder/Pins nutzbar; bei Luftbildausfall können vorhandene Gebäudedaten erscheinen. Fehlende Daten werden nicht durch erfundene Stadtblöcke ersetzt. Netzwerk- und Gebäudestatus sind im Berlin-Menü abrufbar. Kein SLA des kostenlosen Tile-Anbieters.

## Reale Orte, fiktive Events

Event-IDs, Genres, Eintrittspreise und Beispieldatum20.10.2026 bleiben erhalten. Veranstaltungsnamen, Zeiten und Konditionen sind weiterhin erfunden. Es bestehen keine bestätigten Veranstaltungen, Buchungsmöglichkeiten oder Verbindungen zu den Betreibern.

| Event-ID | Reale Location | Koordinaten lon,lat | OSM-Quelle |
| --- | --- | --- | --- |
| bar | Fahimi Bar |13.41978,52.49928|[node2789114069](https://www.openstreetmap.org/node/2789114069)|
| afterhours | Berghain |13.44304,52.51117|[node6341225967](https://www.openstreetmap.org/node/6341225967)|
| soft-sunset | Weekend Club |13.41642,52.52290|[node1162812586](https://www.openstreetmap.org/node/1162812586)|
| hiphop | Heimathafen Neukölln |13.43992,52.47702|[node910361469](https://www.openstreetmap.org/node/910361469)|
| afro | Lido |13.44508,52.49922|[node360111407](https://www.openstreetmap.org/node/360111407)|
| date | Klunkerkranich |13.43133,52.48207|[node2941462114](https://www.openstreetmap.org/node/2941462114)|
| techno2 | ://about blank |13.46630,52.50248|[node5906879511](https://www.openstreetmap.org/node/5906879511)|

Koordinaten aus OSM-Geodaten, über Mapcarta recherchiert; Adressen mit Betreiberseiten abgeglichen: [Lido](https://www.lido-berlin.de/pages/kontakt), [Heimathafen](https://heimathafen-neukoelln.de/impressum/), [Fahimi](https://fahimibar.de/), [Klunkerkranich](https://klunkerkranich.org/contact/), [aboutblank](https://aboutblank.li/impressum/). Die Punkte markieren reale POIs, nicht zwingend geometrische Dachmittelpunkte. Das Label hängt über dem Kartenpunkt, ohne vermessene Dachhöhen-Bindung. Namensnennung/ODbL-Link auf der Karte und im Datensatz.

## Nachweise

Automatisierte Tests prüfen Takt-/Pause-/Ankunftslogik, Wiederholung, Suchfokus, reduzierte Bewegung, Bereinigung, echten Gebäude-Layer mit gültiger Style-Spezifikation und den initialen Server-Render. Sie ersetzen keinen Browser-/iPhone-Test. Externe Kartenhosts sind durch die Netzwerkpolicy der Arbeitsumgebung gesperrt, Browserwerkzeuge fehlen. Daher wurden reale Kacheln, sichtbare Extrusionen, Flugqualität und Touch-Bedienung hier nicht visuell bestätigt. Kein Schluss von Netzwerkproblemen dieser Umgebung auf einen Anbieterfehler.

Aktuelles Premium-Design und Performance-Vergleich: PERFORMANCE.md. Die Daten und Anbieter bleiben erhalten; Laufzeitqualität weiterhin nicht im Browser gemessen.

Aktuelle Vorbereitung und Ankunftsprüfung: `PRELOADING.md`; sie ersetzt die bisherige reine moveend-/Idle-Steuerung.

Neuer aktueller Bericht: `LIVING-CITY.md`. Frühere Ankunfts-/Verweildauer-Beschreibungen in älteren Berichten sind historisch.
