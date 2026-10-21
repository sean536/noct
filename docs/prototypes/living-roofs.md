# Living Berlin – Phase 1: Dächer

Entwicklungsbranch `feature/noct-3d`, Ausgangsstand `0100935`, 21.10.2026. Nur die Dachdarstellung der vorhandenen Kachelebene wird weiterentwickelt. Vollständige Testapp: https://noct-facades-test.tuned-cove-5285.chatgpt.site. Echter Vorher-Nachher-Vergleich: https://noct-facades-test.tuned-cove-5285.chatgpt.site/prototypes/roofs/.

## Befund und Umsetzung

Der bisherige Dachzweig mischte lediglich zwei graue Farbtöne. Seine zweite Texturkoordinate war sogar die konstante Gebäudehöhe statt einer räumlichen Dachachse. Es gab deshalb weder brauchbare zweidimensionale Dachstruktur noch individuelle Dachmaterialien.

`lib/facade-tile.ts` erzeugt jetzt zwei metrische Dachkoordinaten mit festem Berlin-Bezug. Sie hängen nicht von der aktuellen Kamera ab. Die vorhandenen indizierten Dreiecke, Innenhöfe, Grundrisse, Höhen und Normalen bleiben identisch. Materialachsen richten sich bei vollständigen Grundrissen nach der längsten Gebäudekante; angeschnittene Kacheldachflächen verwenden eine gemeinsame Ausrichtung, damit keine künstlichen Texturkanten entstehen.

`lib/roof-material.ts` wertet **optionale** `roof:material`, `roof:colour` / `roof:color` und `roof:shape` sowie entsprechende Unterstrich-Schreibweisen aus. Unterstützt werden unter anderem Ziegel, Schiefer, Zink/Metall, Kupfer, Kies, Bitumen und begrünte Oberflächen sowie Hex-/gängige benannte Farben. Das bestehende OpenMapTiles-Gebäudeschema garantiert diese Dachattribute nicht. Es gibt **keinen neuen OSM-API-Abruf** und keine Behauptung, dass diese Attribute in den aktuell ausgelieferten OpenFreeMap-Kacheln enthalten sind.

Fehlende Angaben erhalten deterministische, plausible Materialvarianten für die vorhandenen planaren Dachflächen: Bitumenbahnen, Kies, gefalztes Metall, gelegentlich patinierte oder begrünte Oberflächen. Tags haben Vorrang vor Varianten. IDs aus `osm_id` / `@id` werden genutzt, soweit vorhanden; ansonsten Höhe/Basis und ein stabiler geografischer Komponentenanker. Bei kachelgeschnittenen Komponenten dient eine gemeinsame Höhen-/Basisidentität der Kontinuität über Kachelgrenzen. Fehlende Originalmaterialien werden nicht als erhobene Daten ausgegeben.

`lib/roof-shader.ts` ergänzt Bahnen-/Falzfugen, bei entsprechendem Material Ziegel-/Schiefermuster, grobe Alterung und dezente Dachakzente. Ein sicherer Akzentmittelpunkt liegt im größten passenden Dreiecks-Inkreis der tatsächlichen Dachtriangulierung; begrenzte Radien schützen Innenhöfe und Kanten. Auf ungeeigneten, zu schmalen, kachelgeschnittenen oder als geneigt getaggten Dächern entfallen diese Akzente. Bei passenden ebenen Flächen erscheinen Oberlicht-, Lüftungs-/Schornsteinkappenmuster und vereinzelt ein Holzdeck mit Pflanzbereich.

**Diese Details sind schattierte GPU-Oberflächendarstellungen, keine zusätzlichen dreidimensionalen Schornstein-, Geländer- oder Terrassenmodelle.** Sie erzeugen keine neue Silhouette und keine dynamischen Schlagschatten. Aus Grundriss plus Extrusionshöhe lässt sich die tatsächliche Sattel-/Walm-/Mansarddachgeometrie nicht rekonstruieren. Auch bei einem vorhandenen Form-Tag bleibt die tatsächliche gelieferte Fläche erhalten; es wird keine unbekannte Dachneigung oder Firsthöhe erfunden.

## Performance und Fallback

Ein Materialprogramm, weiterhin ein Draw Call je nichtleerer sichtbarer Kachel. Keine zusätzlichen Dachobjekte, Bildtexturen, Netzquellen, Timer oder Abhängigkeiten. Die Erweiterung nutzt den bisherigen Worker, die Kachel-Caches, Speicherziele und Entsorgung. Die Anzahl der sichtbaren Gebäude wird nicht wieder beschränkt.

Feine Strukturen werden über Fragmentableitungen bei Entfernung geglättet; entfernte Dächer behalten Materialfarbe und grobe Alterung. Zusätzliche Kieskörnung respektiert das vorhandene mobile/adaptive Qualitätsbudget. Mikrostruktur auf begrünten Flächen wird ebenfalls bei Entfernung ausgeblendet. Es gibt keine zeitgesteuerten Dachmuster. Der bestehende native Fassaden-/Geometriefallback bleibt bei fehlendem Worker oder WebGL-Fehler unverändert aktiv; im reinen Notfallmodus sind die neuen Dachmaterialien nicht verfügbar.

| Reproduzierbarer realer QA-Ausschnitt | Vorher | Dachphase |
| --- | ---: | ---: |
| Echte Polygon-Komponenten | 95 | 95 |
| Kachelstücke nach Grenzschnitt | 100 | 100 |
| Basis-Draw-Calls | 2 | 2 |
| Indizierte Vertices | 6.805 | 6.805 |
| Geometriepuffer CPU | 307.924 Bytes | 525.684 Bytes |
| Dach-Texturdownloads | 0 | 0 |

Die zusätzlichen acht Material-/Akzentattribute pro Vertex erhöhen diese Puffer um rund 71 %. Auch die GPU benötigt entsprechend größere Vertexpuffer. Das ist der konkrete Preis des gemeinsamen Layouts ohne zusätzliche Draw Calls. Der Shader ist aufwendiger als der bisherige Grauton; daraus folgt **kein** behaupteter FPS-Gewinn. Speicherzahlen betreffen nur diese Kachelpuffer, nicht den Gesamtspeicher der App.

## Prüfungen und sichtbarer Vergleich

Die Vergleichsbilder stammen aus der **tatsächlich laufenden vollständigen Root-App**, vor und nach der Änderung, identische Kamera und reale Berliner LoD2-Grundrisse/Höhen. Das bekannte Fixture enthält 20 MultiPolygon-Features mit 95 Komponenten, Quelle/Blob/Lizenz in `tests/fixtures/berlin-weekend.json`, Datenlizenz Deutschland – Zero – 2.0. Für reproduzierbare Browserprüfungen wird dieses Fixture im Provider-MVT-Format abgespielt, mit neutralem QA-Raster. Es ist kein frisch abgerufener Live-Kachelbestand und keine synthetische Präsentationsgrafik. Auf der interaktiven Testapp bleiben die normalen Live-Dienste konfiguriert.

Geprüft werden:

- Unveränderte XYZ, Normalen, Indizes sowie komplette Wandmaterial-/Fensterkoordinaten gegen die Ausgangsversion für alle 100 Kachelstücke.
- Deterministische Dachauswahl, beide UV-Achsen, Vorrang optionaler Material-/Farb-Tags, ungültige Angaben, keine erfundene Dachneigung. Akzent-Inkreise gegen die tatsächlichen Dachdreiecke einschließlich Innenhöfen.
- Vollständige Root-App Desktop 1365×900 und Touch-Mobilansicht 390×844; vorhandene schräge Perspektiven, Zoom/Drehen, aktive Kachelabdeckung und keine Shader-/JavaScriptfehler. Derselbe statische Dachausschnitt bleibt beim erneuten Rendern pixelgleich. Dachmetadaten bleiben beim Zoomen/Drehen erhalten.
- Vorhandene Eventdetails, Speichern, Quick-Reply → Chat/Empfehlungen sowie ursprüngliche Fallbackgebäude bei bewusst blockiertem Worker.
- Bestehende Testsuite: 88 Einzeltests erfolgreich (einschließlich vier neuer Dachtests), TypeScript und Produktionsbuild erfolgreich. UI-, Kamera-, Event-, Chat-, Verkehr- und Schedulerdateien werden zusätzlich per Hash auf unveränderten Inhalt geprüft.

Chromium/SwiftShader erlaubt funktionale Prüfung und echte Codeaufnahmen, **keine belastbare Aussage über GPU-Belastung, echte iPhone-FPS oder flüssige Darstellung auf allen Geräten**. Ein frischer Abruf von `tiles.openfreemap.org/planet` wurde hier erneut mit CONNECT 403 durch die Netzwerk-Policy blockiert. Die konkrete live ausgelieferte Dachattributbelegung konnte deshalb nicht bestätigt werden.

## Phasenstatus

1. Dachmaterialien und prozedurale Oberflächendetails sind der Lieferumfang dieses Schritts.
2. Dynamische, tageszeitabhängige Fensterbeleuchtung: **nicht begonnen**; bisherige statische Fensterbeleuchtung unverändert.
3. Zusätzliche Verkehrsweiterentwicklung: **nicht begonnen**; vorhandene Verkehrssimulation und Straßendatenanbindung unverändert.

Kein Merge nach GitHub-`main`, keine Änderung der ursprünglichen öffentlichen NOCT-Website, kein UI-Redesign und keine Änderung der Kameratour. Der separate Vergleich ist eine zusätzliche QA-Dokumentationsseite, kein neues Panel in der App.
