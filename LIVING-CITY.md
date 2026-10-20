# Living City: Architektur, Smart Arrival und Verkehrsprototyp

Stand: 20. Oktober 2026. Weiterentwicklung der bestehenden NOCT-Nightlife-App. Kein Engine-Wechsel, keine neue Dependency, keine Änderung bestehender Events oder Datenanbindungen.

## Was die Szene tatsächlich enthält

| Bestandteil | Quelle und Aufgabe |
| --- | --- |
| Renderer/Kamera | MapLibre GL JS 5.20.0, eine dauerhafte WebGL-Map |
| Bodenbild | Geoportal Berlin, DOP 2025 Frühjahr über WMS; echte zweidimensionale Orthophotos |
| Gebäudegrundrisse | OpenStreetMap über OpenFreeMap-Vektorkacheln |
| Datenformat | OpenMapTiles-Schema, Layer `building`, `render_height`, `render_min_height`, `hide_3d` |
| Straßen für die Simulation | Layer `transportation` derselben bereits geladenen Vektorkacheln |
| Optionaler vorhandener Bildanbieter | MapTiler Satellite bei bereits eingerichteter Umgebungsvariable; bleibt optional |

OpenMapTiles ist hier das Schema, OpenFreeMap liefert die Tiles, OSM liefert die kartierten Geometrien. Geoportal liefert in dieser Integration ausschließlich Luftbilder, keine 3D-Häuser. Höhen sind Anbieterwerte aus OSM-Höhen/Geschosszahlen bzw. Schätzungen; sie sind nicht flächendeckend vermessen. Die aktuelle OpenMapTiles-Implementierung kann selbst Ersatzhöhen liefern. Das ist ausdrücklich kein amtliches LoD2-Modell.

Die Berliner DOP-Metadaten nennen **0,20 m Bodenauflösung** und ungefähr **±0,4 m Lagegenauigkeit**. Unsere Quelle liefert 512×512-Pixel-WMS-Kacheln. Bei der finalen Kamerastufe 16,6 wird für diese Quelle normalerweise native Rasterstufe17 angefordert: in Berlin ungefähr0,36m pro Bildpixel. Höherer Device Pixel Ratio erzeugt keine zusätzlichen Quelldetails. Luftbild und OSM stammen zudem nicht zwingend vom gleichen Aufnahmezeitpunkt; Positionsunterschiede und Bildparallaxe bleiben möglich. [Offizielle Metadaten](https://daten.berlin.de/datensaetze/digitale-farbige-orthophotos-2025-dop20rgbi-wms-6529de5a).

## Warum die Häuser bisher so aussahen

Die App extrudiert Grundrisspolygone senkrecht nach oben. Sie besitzt keine Fassadenfotos, Dachtexturen oder detaillierten Dachgeometrien. Flache Dächer und einfache Volumen sind deshalb die vorhandene **Modellqualität**, kein noch ausstehender Download. Fehlende oder geschätzte Höhen lassen sich durch längeres Warten nicht verbessern.

Die Deckkraft war ausdrücklich auf **0,78** gesetzt. Dadurch schimmerte das Boden-Luftbild durch die weiß-grauen Volumen. Neu sind **vollständig deckende Gebäude**, eine zurückhaltende, nach Höhe abgestufte Steinfarbe und ein gleichbleibendes gerichtetes MapLibre-Licht. Die Engine schattiert damit Gebäudeseiten; es wurden **keine echten Schlagschatten, PBR-Materialien oder Fototexturen** hinzugefügt. Grundrisse, Höhe, Gebäudeteile und Ausschluss von `hide_3d` bleiben erhalten. Keine erfundenen Ersatzhöhen.

Die Kombination aus Luftbildboden und stilisierten Häusern bleibt ein Kompromiss. Ein vollständig stilisierter Vektor-Stil könnte homogener wirken, würde aber das bisherige echte Luftbild ersetzen. Diese weitergehende Umstellung wurde nicht vorgenommen.

## Warum Daten sichtbar nachladen

MapLibre fordert Kartenkacheln für den aktuellen Sichtbereich und seine Detailstufen an. Ein HTTP-Prefetch kann den Browser-Cache wärmen; er erzeugt keine unsichtbare fertig geparste/GPU-geladene Zielszene. Worker-Verarbeitung und GPU-Upload folgen erst, wenn die Engine die betreffenden Tiles benötigt. MapLibre5.20 besitzt kein unterstütztes `preloadOnly` für beliebige unsichtbare Zielkameras.

Die vorherige Optimierung näherte sich bereits auf Zoom16,6 bis etwa22m an das endgültige Ziel und prüfte dann die Bereitschaft. Das war für die neue Anforderung zu spät. Ein allgemeines `idle` oder `moveend` bestätigt keine vollständigen Häuser. Auch `areTilesLoaded()` allein genügt nicht, weil fehlerhafte Tiles als abgeschlossen gelten können.

## Smart Arrival und endlose Tour

- **Höherer Anflug:** zunächst Zoom15,35 mit schräger3D-Perspektive und ungefähr180m Abstand zum Event. Basisdauer regulär2.600–4.600ms nach Entfernung; einmaliger Intro-Anflug3.200ms. Dadurch gerät die Umgebung vor dem Nahflug in den tatsächlich sichtbaren Engine-Ladebereich.
- **Vorbereitung:** aktuelle Zielnachbarschaft früh anfordern. Maximal vier Gebäude- und neun Rasterkacheln, zwei zusätzliche niedrig priorisierte Requests, native Source-Zoomgrenzen beachten. Vorladen bleibt auf Economy/Save-Data reduziert bzw. deaktiviert; kein zusätzlicher MapTiler-Satelliten-Prefetch.
- **Bereitschaft vor dem Abstieg:** geladene native Gebäudekacheln um das Ziel, sichtbare Gebäudefeatures nach dem Zeichnen, Quellen-/Viewport-Bereitschaft und bereits erfolgreich vorgewärmte finale Rasterkacheln, sofern zusätzliches Prefetch unterstützt/aktiv ist. Zwei stabile Beobachtungen mit mindestens100ms Abstand. Ein erfolgreicher HTTP-Fetch wird dabei ausdrücklich nicht mit GPU-Bereitschaft gleichgesetzt.
- **Dynamischer höherer Bogen:** falls noch nicht ausreichend bereit, maximal2.200ms bei Zoom15,55 und kleinen Positions-/Blickrichtungsänderungen weiterfliegen. Sobald die Bedingungen erfüllt sind, beginnt der Abstieg. Bei Zeitüberschreitung bleibt der Event-Vorbeiflug höher; kein erzwungener Nahzoom auf eine unvorbereitete Umgebung.
- **Abstieg:**1.800ms auf Zoom16,6 und die endgültige Geräte-Perspektive. Bereits währenddessen wird das folgende Tour-Ziel vorgewärmt.
- **Finale Prüfung:** für den tatsächlichen aktuellen Blickwinkel neun Bodenpositionen mit öffentlichem `unproject` um die Eventposition ermitteln und deren native Bild-/Gebäudekacheln prüfen. Zusätzlich Quellenstatus, gerenderte zentrale Gebäude, finalen Zoom und Pitch bestätigen. Diese Prüfung erfolgt nach `render`, höchstens etwa10-mal pro Sekunde während eines Flugs. Sie ist stärker als ein einzelnes zentrales Tile, bestätigt aber nicht jede Randkachel oder einen GPU-Fence.
- **Bewegte Eventpräsentation:**2.000ms langsamer Vorbeiflug statt Stillstand. Danach unmittelbare Übergabe an den nächsten Event-Anflug, nach dem letzten Event zurück zum ersten. Keine feste Zwei-Sekunden-Rotation, kein regelmäßiges stationäres Warten, keine überlappenden Flüge oder neue Szene pro Event. Jede Phase beschleunigt/bremst weich; die genaue visuelle Nahtlosigkeit wurde hier nicht im Browser beobachtet.
- **Abbruch/Fallback:** neue manuelle Auswahl verwirft die laufende Fahrt und deren Listener/Zeitgeber. Eine feste Gesamtdauer schützt auch gegen verlorene Kameraereignisse. Die Laufzeitdiagnose unterscheidet bestätigte Nahansicht, noch unbestätigte Details und höheren Lade-Fallback. Vollständig nachladefreie Ankünfte werden nicht garantiert.

Mit deiner ausdrücklichen Auswahl wurden ausschließlich die drei bisherigen Menübefehle „Tour fortsetzen“, „Tour pausieren“ und „2D / 3D wechseln“ entfernt. Keine neuen Play-/Pause-/Neustart-Buttons. Die Tour kehrt nach manueller Interaktion nach sechs ruhigen Sekunden zurück, sofern keine Eingabe, Suche, Empfehlungsliste oder Detailansicht mehr aktiv ist. Solange ein Finger auf der Karte liegt, beginnt keine Wiederaufnahme. Hintergrundbetrieb und Reduced Motion unterbinden automatische Bewegung; ausdrückliche Auswahl verwendet dann einen einzigen Kamerasprung in3D. Die Karte wechselt nicht automatisch in2D, Mindest-Pitch30Grad.

## Living Traffic: was implementiert ist

Ein **lokaler Verkehrsprototyp**, ausdrücklich keine Live-Positionen. Er liest echte, bereits geladene OpenMapTiles-Straßenverläufe mit `querySourceFeatures` aus derselben Gebäudequelle; der installierte MapLibre-Quelltext bestätigt Zugriff auf die übrigen Layer der vorhandenen Rohkacheln. Keine neue Verkehrs-API und keine zusätzlichen Straßen-Tile-Downloads.

Zugelassen werden geeignete Haupt-/Neben-/Service-Straßen auf Bodenniveau. Brücken, Tunnel, Rampen, erhöhte/unterirdische Ebenen, Innenbereiche, private/gesperrte Wege, Einfahrten und unbekannte Einbahn-Angaben werden ausgeschlossen. `oneway=-1` dreht die Geometrie um. Geschwindigkeiten liegen je Straßenklasse ungefähr zwischen11 und35km/h. Fahrzeuge folgen bestehenden Polylinien, erhalten einen kleinen Rechtsversatz und blenden vor abgeschnittenen Enden aus. Es werden keine getrennten Straßen mit geraden Verbindungsstücken zusammengefügt.

Die Routen werden gegen die geladenen Gebäudegrundrisse mit räumlichem Index und konservativem4m-Abstand geprüft. Kreuzungen mit Gebäuden und zu enge Abstände schließen die gesamte Route aus. Ohne nutzbare Gebäude-/Straßendaten gibt es keine Autos. Zu große/ungültige Footprint-Sätze führen zum Ausblenden, statt stillschweigend Kollisionsflächen zu ignorieren. Diese Prüfung gilt für die vorliegenden OSM-Geometrien; reale, dort fehlende Gebäude oder falsch kartierte Verkehrsregeln kann sie nicht erkennen.

Rendering: MapLibre-Custom-Layer im3D-Depth-Buffer, WebGL2-Instancing, eine gemeinsame Karosserie-/Kabinengeometrie, ein Programm, ein Draw-Aufruf für die Fahrzeuge.72Vertices pro Fahrzeug, keine Fahrzeug-DOM-Elemente und keine zusätzlichen Modelle/Materialdownloads. Die Autos werden durch vorhandene Gebäude verdeckt. Bewegung basiert auf fortlaufender Zeit und wird beim Eventwechsel nicht neu gestartet. Aktive Routenobjekte werden wiederverwendet.

Gerätebudgets: maximal10Autos Economy,24Balanced,48Quality; Positions-Uploads höchstens30Hz. Bei eigener Idle-Animation begrenzte Repaint-Anforderung; während Kamerafahrten wird deren Renderzyklus benutzt. Kleine Zoomstufen, Reduced Motion, Hintergrundbetrieb und geöffnete Eingaben/Panels deaktivieren die Simulation. Anhaltend langsame Render-Abstände oder teure CPU-Updates halbieren die Fahrzeugzahl bis aufnull; bei Entlastung vorsichtige Erholung. Ein teurer Routenaufbau verlängert die Wiederholungsabstände von2,4 bis auf8Sekunden. GPU-Kontextprobleme deaktivieren den Verkehrs-Layer isoliert. Buffer, VAO, Programm, Shader, Timer und Listener werden bereinigt.

Keine Ampel-/Kreuzungsphysik, realen Staus oder Live-Scheinwerferdaten implementiert. Eine spätere Verkehrsdatenanbindung müsste separat Herkunft, Lizenz, Aktualität und zulässige Positionsnutzung klären. Der Prototyp täuscht diese Anbindung nicht vor.

## Messungen und Tests

**48 automatisierte Tests bestanden**, TypeScript und Produktionsbuild ohne Fehler. Ein neuer Regressionstest scheiterte zunächst an der alten Zwei-Sekunden-Verweildauer und besteht nach der Umstellung. Der Integrationstest verbindet die tatsächlichen Tour- und Ankunftscontroller mit kontrollierten Tile-/Render-Signalen: zwölf automatische Vorbeiflüge, wiederholte Reihenfolge, fehlende Daten, keine stationäre Wartezeit, keine konkurrierenden Kameras und keine Timer nach Dispose.

Weitere Prüfungen: höheres Staging, kein Nahflug ohne vorbereitete Umgebung, eigene finale Bereitschaft, Reduced Motion, manuelles Retargeting, UI-/Hidden-Pausen, Style-Validierung samt Licht/Opacity, Einbahnrichtung, Straßen-/Gebäudeausschlüsse, kontinuierliche Fahrzeugpositionen und adaptive Grenzen. Der Custom-Layer-Test verwendet **Fake-GL** und bestätigt Buffer-/Shader-Adapter, Instancing-Aufruf und Freigabe; er ist kein echter GPU-/Shader-Rendernachweis. Bestehende Chat-/Event-/Startscreen-Regressionen bestehen weiter.

| Kontrollierte Eigenschaft | Vorher | Jetzt |
| --- | --- | --- |
| Gebäude-Deckkraft |78%|100%|
| Erste Zielannäherung | Zoom16,6, etwa22m Abstand | Zoom15,35, etwa180m Abstand |
| Regulärer Stillstand nach Event |2.000ms|0ms konfigurierte Verweildauer; bewegte Präsentation |
| Fallback bei fehlender Zielbereitschaft | Übergang nahe am Nahzoom | höherer Vorbeiflug, kein erzwungener Nahflug |
| Zusätzliche Verkehrsdaten-Requests |0|0|
| Fahrzeug-Draw-Aufrufe |0|maximal1, im Adaptertest bestätigt |

Reproduzierbarer CPU-Mikrobenchmark: `node --import tsx scripts/benchmark-traffic.ts`. Synthetisches Testnetz mit26Straßen/144Gebäudegrundrissen; diese Daten werden **ausschließlich im Benchmark**, niemals als Ersatz in der App benutzt. Node24.19.0 in dieser Entwicklungsumgebung:

- Routenaufbau Mittel0,546ms, p95 1,792ms über80Durchläufe.
- Reine Positionsmathematik pro Update: Mittel etwa0,0008ms bei10Autos,0,0014ms bei24 und0,0024ms bei48Autos. Ohne Autos: nur leere Benchmark-Schleife. JIT/GC und Shared-Runner-Last beeinflussen die Werte; keine Ableitung einer Bildrate daraus.
- Geometrie-Buffer2.016Bytes und maximaler Instanz-Buffer1.536Bytes. Dies sind nur die expliziten Fahrzeugbuffer, **keine Messung des gesamten GPU-/App-Speichers**.
- Rohwerte: `/traffic-cpu-benchmark.json`. Keine reale Vorher-/Nachher-Kartenladezeit aus diesen Zahlen abgeleitet.

**Nicht gemessen:** sichtbares Nachladen echter Berliner Tiles, Zeit bis zur stabilen Gebäudequalität, tatsächliche FPS, GPU-Zeiten, gesamter Speicherverbrauch, mobile Wärmeentwicklung und Performance mit/ohne Verkehr im Browser. Hier fehlen Browser-/Screenshot-Werkzeuge, und die Kartenhosts sind im Entwicklungsnetz gesperrt. Das ist kein Nachweis eines Anbieter-/App-Fehlers. Die lokale Diagnose im Berlin-Menü zeigt bei erreichbaren Quellen bestätigte Zielzeiten, Routenaufbau und CPU-Aufrufzeiten der Simulation; keine Telemetrie.

## Empfehlung zur langfristigen Architektur

Mit den jetzigen Daten ist eine saubere **stilisierte Stadt**, keine fotorealistische Stadt möglich. Weitere Wartezeiten würden weder Fassaden noch Dachformen erzeugen. Deshalb wurden solche Versuche nicht weitergeführt und die Engine nicht ersetzt.

| Option | Eignung und Grenzen |
| --- | --- |
| MapLibre + bestehende offene Daten | Für den kostenlosen Prototyp und eigene Gestaltung behalten. Die oben beschriebenen Verbesserungen sind implementiert. Für Fotorealismus fehlen texturierte Geometrien; ein eigener3D-Tiles-Renderer wäre zusätzliche Architektur. |
| Google Maps3D in der Maps JavaScript API | Kandidat für echte fotorealistische Stadtansichten. Erfordert separaten Integrationsnachweis für unsere Berliner Locations, API-/Abrechnungseinrichtung, Vertrags-/Attributionsprüfung und ausdrückliche Zustimmung zum Engine-Wechsel. Die Tiles-API ist ein anderes Produkt. |
| Mapbox GL JS / Standard | Hochwertigere stilisierte3D-Umgebung mit Beleuchtung, ausgewählten Landmark-Modellen und Fassadendetails. Keine Garantie flächendeckender echter Fotofassaden oder genauer Berliner Dachmodelle. Token, kommerzielle Nutzungsbedingungen und Renderer-Wechsel wären erforderlich. |
| CesiumJS + lizenziertes texturiertes3D-Tiles-Mesh | Geeigneter Architekturpfad, wenn echte Dach-/Fassadengeometrie und kontrollierbares3D-Streaming die Produktanforderung sind. Cesium ist der Renderer, kein automatisch vorhandener Berliner Fotodatensatz. Berlin-Abdeckung, Datenlizenz, Bereitstellungskosten und iPhone-Budget müssen vor einer Migration an realen Eventorten nachgewiesen werden. |

Die **Google Photorealistic3D-Tiles-API ist laut aktueller Google-Dokumentation für nach dem8.Juli2025 erstellte bzw. nicht mehr unveränderte Projekte mit EWR-Abrechnungsadresse nicht verfügbar**. Google nennt unter anderem seine3D Maps API als Alternative. Cesium mit Google-Tiles ist deshalb kein automatisch nutzbarer Ausweg für ein neues deutsches Startup. Keine Umgehung über fremde Konten oder erfundene Abrechnungsadressen.

Konkrete Empfehlung: aktuellen kostenlosen MapLibre-Prototyp behalten. Vor einer Entscheidung für Fotorealismus einen getrennten, genehmigten Architektur-PoC mit Google Maps3D oder Cesium plus nachgewiesen lizenziertem Berlin-Mesh durchführen; an denselben vier realen Eventorten auf einem iPhone vergleichen. Keine weitere Material-/Wartezeitoptimierung als Ersatz für fehlende Photogrammetrie versprechen.

Primärquellen, abgerufen20.10.2026:

- [OpenMapTiles-Schema: Gebäude und Straßen](https://openmaptiles.org/docs/schema/)
- [OpenMapTiles-Gebäude: Höhenaufbereitung](https://github.com/openmaptiles/openmaptiles/blob/master/layers/building/building.sql)
- [Geoportal: DOP2025](https://daten.berlin.de/datensaetze/digitale-farbige-orthophotos-2025-dop20rgbi-wms-6529de5a)
- [Mapbox Standard:3D-Umgebung](https://docs.mapbox.com/map-styles/guides/standard-styles/)
- [Google: EWR-Anpassungen und3D Maps Alternative](https://developers.google.com/maps/comms/eea/map-tiles)
- [Cesium: Photorealistic3D-Tiles-Integration](https://cesium.com/learn/cesiumjs-learn/cesiumjs-photorealistic-3d-tiles)
- Installierter MapLibre5.20-Quelltext: `draw_custom.ts`, `custom_style_layer.ts`, `tile.ts`, `query_features.ts`, `map.ts` und Source-/Kameratypen. Kein nicht vorhandenes Shadow-/Offscreen-Preload-API angenommen.

## Scope und Dateien

`app/globals.css`, Hero-/Input-/Chat-/Eventdarstellung, `lib/events.ts`, `lib/chat.ts`, `lib/imagery.ts`, bisherige Renderbudgets, Modal/Poster und Dependencies bleiben unverändert. Eventdaten-SHA256 weiterhin `709695b8ee69fe311f3bccc5eaa83b417ea2e89b113083ce74f0bd899aba55b9`. Bestehende Demo-Kennzeichnung, reale POI-Koordinaten, Affiliate-Felder, Merkliste und Chat-Datenfluss erhalten. Der einzige UI-Eingriff ist die ausdrücklich bestätigte Entfernung der drei Kartenmenübefehle samt zugehöriger veralteter Tour-Hilfe.

Implementierung: `components/CityMap.tsx`, `lib/scene-flight.ts`, `lib/camera-plan.ts` (neu), `lib/tour.ts`, `lib/tile-prefetch.ts`, `lib/buildings.ts`, `lib/traffic.ts` (neu), `lib/traffic-layer.ts` (neu), minimale Anpassung `app/page.tsx`. Tests: Kamera/Tour/Style aktualisiert; `tests/tour-integration.test.ts`, `tests/traffic.test.ts`, `tests/traffic-layer.test.ts` neu. Benchmark: `scripts/benchmark-traffic.ts`. Bericht und aktuelle Prüf-/README-/Tour-Verweise aktualisiert.

Lokal starten: `npm install` bei fehlenden Paketen, anschließend `npm run dev`; Produktionsprüfung mit `npm run typecheck`, `npm test`, `npm run build`. Standardanbieter und Simulation benötigen keinen neuen API-Key.
