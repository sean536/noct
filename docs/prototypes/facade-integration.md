# NOCT – kachelbasierte Fassaden in der vollständigen Webapp

Stand: 21.10.2026, Branch `feature/noct-3d`. Die separate vollständige Testwebsite ist https://noct-facades-test.tuned-cove-5285.chatgpt.site. Der Zugriff bleibt entsprechend ihrer aktuellen Freigabe unverändert. Die ursprüngliche öffentliche NOCT-Website, GitHub-`main` und `design/noct-apple` werden nicht aktualisiert.

Die Dachdarstellung wird durch die anschließende [Phase 1: Living Berlin](living-roofs.md) erweitert. Aktuelle Dachmaterialien, zusätzlicher Pufferspeicher und der sichtbare Vergleich sind dort dokumentiert.

## Ursache und Änderung

Die vorherige Integration zerlegte MultiPolygone bereits korrekt, begrenzte den eigentlichen Fassadenrenderer aber auf 12/20 Grundrisse, Zoom ≥15,4 und verzögerte Bewegungsaktualisierungen. Deshalb dominierten die ursprünglichen einfarbigen Extrusionen weiterhin große Stadtbereiche. Das war ein Abdeckungsproblem, nicht durch längeres Warten lösbar.

Die Hauptkarte verarbeitet jetzt **sämtliche gültigen Gebäudegeometrien jeder sichtbaren Gebäudekachel**, ohne Anzahl-, Radius- oder 15,4-Fassadengrenze:

- `lib/facade-map.ts` bestimmt die sichtbaren Kacheln über die öffentliche MapLibre-API `coveringTiles`. Aktualisierung direkt bei `move` und Gebäudendatenereignissen. Zwei parallele Anfragen mit Priorität für aktuell sichtbare Kacheln; zusätzliche Vorbereitung der vorhandenen Eventregionen. Die Tile-URLs stammen aus der bereits bestehenden Gebäudequelle.
- `lib/facade-tile.ts` verarbeitet alle Polygon-/MultiPolygon-Komponenten einschließlich Innenhöfen, echten Höhen und erhöhten Gebäudeteilen. Geometrie wird an der kanonischen Kachelgrenze geschnitten; künstliche Kachelschnittwände werden ausgeschlossen. Dachtriangulierung erhält Innenhöfe. Fehlende/ungültige Geometrien und Höhen werden nicht erfunden.
- `workers/facade-worker.ts` bereitet indizierte Kachelgeometrie außerhalb des Hauptthreads vor. `scripts/build-facade-worker.mjs` erzeugt vor Entwicklung, Tests, Typecheck und Build einen inhaltsadressierten statischen Worker samt Drittanbieterlizenzen. Dies vermeidet einen im Browser nachgewiesenen Turbopack-Fall, bei dem eine Worker-URL unkompiliertes TypeScript ausgab. Ein ebenfalls im Root-Browser gefundener ungültiger `fetch`-Aufrufkontext wurde korrigiert und durch einen Regressionstest abgesichert.
- `lib/facade-tile-layer.ts` verwendet einen gemeinsamen WebGL2-Shader und einen indizierten Draw Call je nichtleerer sichtbarer Kachel. Fenster, Rahmen, Sohlbänke, Geschossbänder, Putz-/Ziegelvarianten und warme Fensterlichter entstehen im Shader, ohne einzelne Fensterobjekte. Schiefer-/Zinkfarbtöne unterscheiden Dächer von Wänden. Abstände sind metrisch, Varianten deterministisch an Wandebene und Höhe gebunden.
- Entfernte Flächen wechseln kontinuierlich zu einfachen Material-/Geschossmustern. Sie fallen nicht auf einfarbiges Beige zurück. Mobile Geräte reduzieren feine Materialkörnung; die grundlegende Fenster-/Wanddarstellung bleibt erhalten.
- `lib/facade-materials.ts` installiert acht kleine gemeinsame Materialbilder synchron beim Laden des Kartenstils. Die nativen MapLibre-Extrusionen nutzen damit von Anfang an prozedurale Fenster-/Geschossmuster und abgestimmte Farbvarianten, auch solange eine Custom-Kachel vorbereitet wird oder der zusätzliche Renderer ausfällt. Nur `style.load`-Materialregistrierung und ein Import wurden in `components/CityMap.tsx` ergänzt.
- Zusätzliche Balkongeometrie bleibt ausschließlich in Kameranähe und bei ausdrücklich geeigneten Nutzungsattributen aktiv (`lib/facade-near.ts`). Die dortigen Detailbudgets beschränken **nicht** die flächendeckenden Fassadenmaterialien. Fehlende Wohnnutzungsdaten werden nicht als tatsächlich vorhandene Balkone ausgegeben.

Die nativen Gebäude bleiben als geometrischer Tiefen-/Fehlerfallback erhalten. Der Custom-Renderer legt passende Oberflächen auf dieselben Grundrisse und Höhen, mit kleinem GPU-Tiefenoffset; er erzeugt keine versetzten zweiten Gebäudekörper. Die Basisszene und die ergänzenden Oberflächen verursachen trotzdem zusätzlichen Overdraw. Im reinen nativen Notfallmodus kann das Fassadenmuster auch auf Dachflächen erscheinen; der normale Custom-Renderer ersetzt dies durch eigene Dachmaterialien.

## Streaming, Ressourcen und Grenzen

Der Renderer speichert fertige CPU-Geometrie und GPU-Puffer wiederverwendbar pro Kachel. Vorbereitete Eventkacheln werden während vorhandener Kameraframes schrittweise auf die GPU geladen. Inaktive Kacheln werden nach LRU entfernt: Zielbudget CPU plus GPU 32 MiB mobil bzw. 96 MiB Desktop; maximal 64/192 residente Kacheln, solange nicht aktiv sichtbar. **Sichtbare Kacheln bleiben erhalten und können diese Ziele bei extremen Ausschnitten überschreiten.** Dies ist kein garantiertes Gesamtspeicherlimit der App.

Anfragen verwenden normalen HTTP-Cache, keine dauerhafte Offlinekopie und keine neue kostenpflichtige API. Veraltete Anfragen werden abgebrochen; Zeitlimits, begrenzte Fehlerhistorie und Wiederholabstand verhindern endloses Warten. Unsichtbarer Tab und Entfernen der Ebene räumen Anfragen, Listener, Timer, Worker und GPU-Ressourcen auf.

Die vorhandene Quelle beginnt mit verwertbaren Gebäudehöhen bei Zoom 14. Ohne entsprechende Daten können unterhalb dieses Quellbereichs keine unbekannten Gebäude rekonstruiert werden. Das ist keine neue Fassaden-LOD-Grenze. Abdeckung wird anhand vollständiger sichtbarer Quellkacheln bestimmt, einschließlich Gebäudeteilen am Rand.

**Keine vollständige Netz-/Renderbereitschaft wird vorgetäuscht:** Vorbereitet werden vorhandene Eventzentrum-Kacheln, nicht garantiert jede spätere Perspektive bei beliebiger Netzwerkgeschwindigkeit. Die öffentliche MapLibre-API garantiert keine vollständige finale Datenvorladung. Die weiterhin unveränderte Kameratour wird nicht künstlich blockiert oder neu getaktet. Bereits vorhandene Daten haben sofort einen nativen Fassadenmaterial-Fallback; zusätzliche Oberflächen können bei kaltem Cache/Netzausfall noch nachrücken. Fehlende Quelldaten lassen sich dadurch nicht ersetzen. Keine pauschale Zusicherung von ruckelfreien Flügen oder physischer iPhone-Leistung.

Fenster, Materialien, Beleuchtung und gegebenenfalls Balkone sind **prozedural, keine fotografisch erfassten Berliner Fassaden**. Die tatsächlichen Gebäudegrundrisse und Höhen stammen unverändert aus der bestehenden OpenFreeMap/OpenMapTiles/OSM-Quelle. Attribution bleibt erhalten. Die bestehenden Rasterluftbilder werden nicht verändert. Für echte Fassadentexturen, belegte Dachformen und Einzelgebäudematerialien ist ein geeigneter zusätzlicher Datensatz erforderlich.

## Tatsächlich geprüft

`tests/fixtures/berlin-weekend.json`: 20 reale Berliner LoD2-Features mit 95 Polygon-Komponenten und Höhen nahe dem vorhandenen Weekend-Club-Gebiet; Quelle und unveränderlicher Git-Blob im Fixture, Datenlizenz Deutschland – Zero – 2.0. Absolute NH-Höhen werden nicht als Höhe über Grund verwendet. Nur QA-Daten, kein Ersatzdatensatz in der App.

Die Geometrien wurden für die Browserprüfung in das dokumentierte MultiPolygon-/MVT-Providerformat übersetzt. Die **vollständige Root-App** lief mit ihren Produktionschunks und dem tatsächlichen statischen Worker in Chromium/SwiftShader, Desktop 1365×900 und Touch-Mobilansicht 390×844. Für den vollständigen QA-Ausschnitt wurde die vorhandene Karte manuell auf die Datenregion gesetzt; Produktionszoom 16,6, schräge Perspektiven 58°/48°. Der neutrale QA-Hintergrund ist kein behauptetes Luftbild. Die Testinstrumentierung beobachtet Map/Worker/Draw Calls, ersetzt aber keine Fassadenlogik.

| Gleicher QA-Datenausschnitt | Vorherige Fassung | Kachelrenderer |
| --- | ---: | ---: |
| Detaillierbare Komponenten Desktop | höchstens 20 | alle 95 |
| Detaillierbare Komponenten Mobilprofil | höchstens 12 | alle 95 |
| Hauptkarten-Fassaden bei Zoom 14,5 | aus | aktiv |
| Geometrie dieses Ausschnitts | ca. 63 / 41 KiB Desktop/Mobil | ca. 301 KiB, gemeinsam indiziert |
| Zusätzliche Basis-Draw-Calls im Ausschnitt | 1 | 2, eine pro nichtleerer Kachel |

95 echte Komponenten ergeben durch Kachelgrenzen **100 Kachelstücke**, keine 100 verschiedenen Häuser. Zwei nichtleere Kacheln werden in beiden Ansichten gezeichnet; alle aktiven Kacheln waren bereit. Beobachtete mittlere reine CPU-Zeit im Custom-Rendercallback ca. 0,04–0,17 ms in diesen Läufen. Das misst weder gesamte Framezeit noch GPU-Laufzeit, Netzladezeit oder physische iPhone-FPS. Kein Live-Vorher-/Nachher-Ladezeitversprechen.

Geprüft: sichtbare Fenster-/Materialvarianten im vollständigen Ausschnitt, normale schräge Perspektiven, niedrigerer Zoom ohne Fassadenabschaltung, Zoom-/Drehgesten, Shader-/Worker-Ausführung während vorhandener Flüge, Eventdetails, Speichern, Quick-Reply → Chat/Empfehlungen und kein horizontaler Layoutüberlauf. Zusätzlich wurde der Workerabruf im Root-Browser absichtlich blockiert: Die Custom-Ebene wurde sauber entfernt, alle acht nativen Fassadenmaterialien blieben verfügbar, native Gebäude wurden weiterhin gezeichnet und Quick-Reply/Chat blieben nutzbar. Unit-Suite: 22 Testdateien einschließlich Kachelgrenzen, vollständiger 30-Kachel-Abdeckung im Scheduler, deterministischer Geometrie, nativer Materialfallbacks und Ressourcenbereinigung. TypeScript und Produktionsbuild werden vor Veröffentlichung ausgeführt.

**Verifikationsgrenze:** Direkter Abruf der aktuellen OpenFreeMap-/Geoportal-Kacheln ist in dieser Entwicklungsumgebung per Netzwerk-Allowlist blockiert (HTTP/CONNECT 403). Die Root-Prüfung mit echten Berliner Geometrien ist erfolgreich; die aktuell live ausgelieferten Providerkacheln und ein physisches iPhone konnten hier nicht zusätzlich bestätigt werden. Die Testwebsite lädt im Nutzerbrowser weiterhin die normalen Live-Dienste.

UI, Chat, Events, Marker, Favoriten, Navigation, bestehende Kameraparameter und Kamerasteuerung bleiben unverändert. Keine Änderung an GitHub-`main` oder am ursprünglichen NOCT-Deployment.
