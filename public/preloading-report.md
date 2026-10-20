> Historischer Bericht der vorherigen Ankunftsoptimierung. Die Nahzoom-Annäherung und stationäre Verweildauer wurden durch höheres Staging und kontinuierliche Vorbeiflüge ersetzt. Aktuell: [Living-City-Bericht](/living-city-report.md). Das Hero-Design bleibt unverändert.

# Zielumgebung vor Ankunft und begrenztes Hero-Refinement

Stand: 20. Oktober 2026. Bestehende NOCT-App, keine neuen Pakete, Provider oder Eventdaten.

## Technische Ursache

Die installierte Engine ist **MapLibre GL JS 5.20.0**. Die Szene kombiniert Geoportal-Berlin-Luftbilder (Raster-WMS) mit OpenFreeMap/OSM-Gebäuden (Vektorkacheln, `fill-extrusion`). Es gibt keine texturierten Gebäudemodelle, deren Texturen separat vorgeladen werden könnten. Die vorhandene Bild-/Geometriequalität bleibt unverändert.

Der bisherige Preloader forderte erst bei `idle` und vollständig geladenem Viewport je **eine zentrale Kachel** des nächsten Ziels an. Bei langsamen Quellen oder fortlaufenden Kamerafahrten konnte dieser Zeitpunkt spät oder gar nicht eintreten. Diese HTTP-Anfragen wärmen höchstens den Browser-Cache. MapLibre muss neue sichtbare Vektorkacheln anschließend weiterhin laden, im Worker verarbeiten und zur GPU übertragen. Fehlgeschlagene Prefetch-URLs wurden zudem dauerhaft für die Sitzung als bereits behandelt markiert.

Bisher meldete `moveend` unmittelbar die Ankunft. Dieses Ereignis bestätigt nur das Ende einer Kamerabewegung. Es bestätigt weder die Zielkacheln noch sichtbare Gebäude. Auch `idle`, Source-Metadaten und `areTilesLoaded()` allein sind dafür ungeeignet: Die installierte Engine zählt bei Letzterem auch fehlerhafte Kacheln als abgeschlossen. Der feste Zwei-Sekunden-Timer konnte eine noch nicht bereite Fahrt zudem durch das nächste Ziel ersetzen.

## Umsetzung

1. Während der zweisekündigen Verweildauer wird das nächste Ziel vorbereitet. Zusätzlich wird das gewählte Ziel unmittelbar beim Flugstart gewärmt, bei Bedarf nochmals nach Eintreffen der Source-Metadaten. Das benötigt kein globales `idle`.
2. Die kleine Zielnachbarschaft hat etwa 220 m Radius, maximal vier Gebäudekacheln und neun Rasterkacheln. Native Source-Zoomgrenzen und Raster-Tilegröße werden berücksichtigt. Für die vorhandenen sieben Koordinaten ergeben sich bei Gebäude-Maxzoom 14 jeweils 1–2 Gebäude- und neun Luftbildkacheln. Große Desktop-Viewports werden damit nicht vollständig vorab heruntergeladen.
3. Gebäudekacheln stehen in der Warteschlange vor Luftbildern. Höchstens zwei zusätzliche Fetches laufen parallel, mit niedriger Priorität; sichtbare MapLibre-Anfragen bleiben der reguläre Ladepfad. Veraltete wartende Nachbarschaften werden ersetzt, erfolgreiche URLs kurz dedupliziert, Fehler dürfen erneut versucht werden. Request-Abbruch nach 2,5 Sekunden; vollständiger Abbruch/Timerbereinigung bei Dispose. Auf Economy-/Save-Data-Geräten entfällt zusätzliches Vorladen; beim optionalen MapTiler werden keine zusätzlichen Satelliten-Requests ausgelöst.
4. Dieselbe Map und ihre bisherigen Tile-/Worker-/GPU-Caches bleiben bestehen. Kein zweiter versteckter WebGL-Renderer. Ausschließlich normaler HTTP-Cache (`cache: default`) unter den Cache-Headern des Anbieters, keine persistente Tile-Datenbank, keine Offline-Sammlung und keine erzwungene Cache-Verlängerung. Die kleine URL-Merkliste speichert keine Tile-Bodies.
5. Der reguläre Flug dauert jetzt entfernungsabhängig ungefähr 1.000–1.700 ms statt 650–1.250 ms. Er nähert sich bei endgültigem Detailzoom bis auf etwa 22 m an das Ziel: Die Engine kann die Zielkacheln bereits während dieser Bewegung verarbeiten. Der einmalige Intro-Anflug bleibt bei 2.200 ms.
6. Die Zielprüfung kombiniert tatsächliche geladene zentrale Raster-/Vektorkacheln auf dem benötigten nativen Zoom, Quellen-/Viewport-Bereitschaft und gerenderte Gebäude in einem kleinen Bereich um die Eventkoordinate. Zwei Bestätigungen nach dem Zeichnen müssen mindestens 80 ms auseinanderliegen. Metadaten und gröbere Elternkacheln reichen nicht aus. Geometrieabfragen laufen nur während der Fahrt und höchstens ungefähr zwölfmal pro Sekunde.
7. Falls noch nicht ausreichend bereit, setzt eine **maximal 1.400 ms** lange, geringe Bewegung zur endgültigen Position den Anflug fort. Sobald die Umgebung bestätigt ist, folgt ein kurzer Abschluss von 240 ms mit erneuter Renderprüfung. Das neue Eventlabel erscheint bei bestätigter Zielansicht oder spätestens an der festen Zeitgrenze. Keine schwarze Fläche, künstliche Unschärfe oder neue Ladeoberfläche.
8. Die Automatik wartet auf den vollständigen Flug-/Renderabschluss oder dessen begrenzten Fallback und verweilt danach **2.000 ms**. Während Vorbereitung und Flug läuft kein Rotationstimer. Es gibt keinen starren Zwei-Sekunden-Zielwechsel mehr, der eine laufende Fahrt abbricht. Manuelle Auswahl unterbricht dagegen sofort und verwirft alte Listener, Timer und Ankunfts-Callbacks. Die bisherigen Pausen bei Eingabe, Dialogen, Eventpanels, Karteninteraktion, Hintergrundbetrieb und reduzierter Bewegung bleiben erhalten. Reduced Motion verwendet bei ausdrücklicher Auswahl einen Sprung ohne zusätzliche Kamerabewegungen.

## Eng begrenztes UI-Refinement

Nur `.minimal-start .greeting` und `.minimal-start .composer` samt ihren Kindern erhalten neue Styles. Der gesamte bisherige CSS-Inhalt bleibt unverändert; die 13 neuen Selektoren sind ausschließlich diesen beiden Bereichen zugeordnet. Systemtypografie mit `-apple-system`/`BlinkMacSystemFont` und lokalen Fallbacks, Anthrazit `#1D1D1F`, gedämpftes Lavendel `#6B579E`, Off-White `#F5F5F7`, eine feine Fokusmarkierung und 16 px Eingabetext. Keine externen Schriftdateien. Die Begrüßung behält Wortlaut und zwei Zeilen; Safe Areas und Keyboard-Verhalten bleiben bestehen.

`app/page.tsx`, sämtliche Event-/Detail-Komponenten, Chatlogik, Events, Kartendesign/Quellen und Dependencies sind bytegleich geblieben. Keine Änderungen an Navigation, Chips, Eventkarten, Merkliste, Chatblasen oder anderen Seiten/Eingaben. Die technische Diagnose im bestehenden Berlin-Menü nennt zusätzlich die letzte Zielansichtszeit und unterscheidet bestätigte Geometrie vom zeitlich begrenzten Fallback; das ist keine neue Oberfläche.

## Nachweise und Messgrenzen

- **39 automatisierte Tests bestanden**, TypeScript und Produktionsbuild ohne Fehler. Enthalten sind kalte/warme Zielansichten, fehlende Daten mit Deadline, Reduced Motion, Timer-/Listener-Bereinigung, schnelle manuelle Abbrüche, automatische Rotation, Dialog-/Eingabepausen, Nachbarschafts-/Native-Zoom-Daten, Fehlerwiederholung, HTTP-Cache-/Parallelitätsgrenzen sowie bestehende Chat-, Daten-, Kartenstil- und Startscreen-Regressionen.
- Ein neuer Test scheiterte mit dem alten Controller: Bei künstlich noch nicht abgeschlossener zweiter Fahrt wurden nach weiteren acht Sekunden insgesamt sechs Flüge gestartet. Mit der neuen Steuerung bleiben es zwei; erst nach Ankunft und 2.000 ms Verweildauer folgt das nächste Ziel. Dies ist ein deterministischer Steuerungstest, **keine gemessene Karten-Ladezeit**.
- Die Test-Scene bestätigt, dass `moveend` bei fehlenden Gebäuden keinen Ankunftsabschluss mehr auslöst. Ausstehende Quellen oder fehlende OSM-Geometrie führen spätestens nach Basisflug + 1.400 + 240 ms zum sauberen Fallback. Timer und Scene-Listener werden dabei entfernt.
- Quell-Diff geprüft: bisheriges CSS unverändert, neue Regeln ausschließlich Hero/Input. Eventdaten weiterhin SHA-256 `709695b8ee69fe311f3bccc5eaa83b417ea2e89b113083ce74f0bd899aba55b9`.
- **Kein Browser-/Screenshot-Werkzeug verfügbar; Kartenhosts sind im Entwicklungsnetz gesperrt.** Deshalb sind reale Vorher-/Nachher-Ladezeiten, sichtbares Pop-in, Bildrate, iPhone-/Desktop-Layout und echte Touch-/Klickabläufe hier nicht beobachtet worden. Das Entwicklungsnetz ist kein Beleg eines App- oder Anbieterfehlers. Die lokale Laufzeitdiagnose im Berlin-Menü ermöglicht Messungen im Browser bei erreichbaren Quellen; keine Telemetrie wird versendet.

## Verbleibende Grenzen

MapLibre 5.20 besitzt kein unterstütztes `preloadOnly`, mit dem beliebige unsichtbare Zielbereiche vollständig im selben Renderer vorbereitet werden könnten. HTTP-Vorladen ist deshalb nur ein Hinweis; Cache-Treffer und Verarbeitung vor Ankunft hängen von Server-Headern, Netz und Gerät ab. Die Zielprüfung bestätigt eine ausreichend vorbereitete zentrale Umgebung und vorhandene Gebäude, nicht jedes einzelne Gebäude, jede sichtbare Randkachel oder einen GPU-Fence. Fehlende OSM-Gebäude bzw. Höhen können durch Vorladen nicht ergänzt werden. Luftbilddetails werden durch Quelldaten, Zoom und Perspektive begrenzt. Nach Ablauf der festen Übergangsgrenze können langsame Details weiterhin nachladen. Vollständig nachladefreie Ankünfte werden nicht garantiert.

## Geänderte Dateien

- `components/CityMap.tsx`: Integration, Zielnachbarschaften, native Tile-/Source-/Renderprüfung, begrenzter Anflug und Diagnose.
- `lib/scene-flight.ts`: abbrechbare Ankunftssteuerung und Render-Bereitschaft.
- `lib/tile-prefetch.ts`: begrenzte Nachbarschaften, Tile-Evidenz, Queue/Fehlerwiederholung/HTTP-Cache.
- `lib/tour.ts`: Rotation nach Abschluss statt Überschreiben laufender Flüge.
- `app/globals.css`: ausschließlich Hero und bestehendes Eingabefeld.
- `tests/cadence.test.ts`, `tests/tour.test.ts`, `tests/scene-flight.test.ts`, `tests/prefetch.test.ts`.
- Dokumentation: dieser Bericht und `public/preloading-report.md`, aktuelles `CHECKS.md`; Verweise/Korrekturen in `README.md`, `TOUR-3D.md` und dem als historisch markierten Performance-Bericht.

API-Nachweis: installierter MapLibre-Quelltext, insbesondere `src/ui/map.ts` (`render` nach `painter.render`), `src/tile/tile_manager.ts` (`areTilesLoaded`, Cache, Tile-Events), `src/source/raster_tile_source.ts` (`tileSize`, `roundZoom`) und Source-/Kameratypen. Vorhandene Quellenlizenzen/Attribution unverändert: Geoportal Berlin DOP 2025 unter dl-de-zero-2.0; OpenFreeMap/OpenMapTiles/OpenStreetMap mit den bestehenden Attributionen. Kein neuer API-Key erforderlich.
