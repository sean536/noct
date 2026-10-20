# NOCT – isolierter prozeduraler Fassaden-Prototyp

**Aktualisierung:** Der folgende Bericht beschreibt den isolierten Prototypstand vor der anschließend beauftragten Integration. Der aktuelle Featurebranch bindet den Generator nun in die Hauptkarte ein; siehe [Integration, Tests und Vorschau-Status](facade-integration.md). Die öffentliche NOCT-Website bleibt unverändert.

Stand: 20.10.2026. Arbeitsbranch `feature/noct-3d`, Basis `c1d8f55`. Kein Push, Merge oder Deployment. Die bestehende NOCT-App einschließlich Hauptkarte, Kameratour, Hero, Events, Chat, Navigation und Merkliste bleibt unverändert.

## Start und Vergleich

```sh
npm ci
npm run dev
```

- **Echte Kartendaten:** `http://localhost:3000/prototypes/facades/`
- **Netzunabhängige Prüfszene:** `http://localhost:3000/prototypes/facades/?fixture=1`
- **Unveränderte NOCT-App:** `http://localhost:3000/`
- Der vorherige GLB-Importviewer unter `/prototypes/berlin-buildings/` bleibt separat erhalten.

Im Live-Modus wird zuerst das bestehende Eventgebiet des Lido in Kreuzberg geladen. Andere vorhandene Eventgebiete sind auswählbar. Nach dem Laden erfasst „Gebäude erfassen“ bis zu 16 geeignete Gebäude aus der vorhandenen Quelle. Fenster, Materialien und Balkone sind **prozedurale Interpretationen**, keine erfassten Berliner Fassaden. Die synthetische Prüfszene ist ausdrücklich als solche beschriftet und wird nie still als Berliner Ersatzdatensatz aktiviert.

„Vorher · OSM“ zeigt die bestehenden Extrusionsregeln auf denselben ausgewählten Grundrissen; „Nachher · Fassaden“ zeigt deren prozedurale Darstellung. Nur im Labor sind die übrigen OSM-Extrusionen während dieses begrenzten Vergleichs ausgeblendet. Bei fehlgeschlagener Vorbereitung oder Rendering wird die originale Gebäudeschicht wiederhergestellt. Die Hauptkarte importiert kein neues Modul und erhält keine neuen Abhängigkeiten.

## Technische Umsetzung

MapLibre GL JS **5.20.0**, Three.js **0.180.0**, vorhandenes Next.js/React/TypeScript. Keine zusätzliche Dependency, keine externe Schrift oder Textur, keine kostenpflichtige API.

| Modul | Aufgabe |
| --- | --- |
| `prototypes/facades/data.ts` | Begrenzte Auswahl, kanonische Grundrisse, stabile IDs/Seeds, lokale Meterkoordinaten, Höhen-/Nutzungsprüfung und LOD-Regeln |
| `prototypes/facades/mesh.ts` | Gebatchte Fassaden- und Dachgeometrie, Shader-Fenster, gemeinsame instanzierte Balkone, Freigabe der Ressourcen |
| `prototypes/facades/layer.ts` | MapLibre-Custom-Layer mit geteiltem WebGL-Kontext, Kameramatrix, Detailreduktion und CPU-/Geometriezählern |
| `app/prototypes/facades/` | Getrennte Testseite mit A/B-Vergleich, Testflug, Tag/Nacht und Messwerte-Export |
| `tests/facades.test.ts` | Determinismus, Dubletten/Fragmente, fehlende Daten, Innenhöfe, Georeferenzierung, LOD und Dachgrenzen |

### Daten und Georeferenzierung

- Live-Geometrie: derselbe OpenFreeMap-Vektordienst wie in NOCT, Source-Layer `building`; OSM-/OpenMapTiles-Höhen `render_height` und `render_min_height`. Alternativ werden tatsächlich vorhandene `height`-Eigenschaften akzeptiert. Keine erfundenen Standardhöhen.
- Unterstützt werden kleine Polygon-Grundrisse einschließlich Innenhöfen. Multipart-Objekte, schwebende Gebäudeteile, fehlende/ungültige Höhen, übergroße Grundrisse und widersprüchliche Geometrien unter derselben ID werden übersprungen. Höchstens 4.096 Eingabefeatures, 128 Eckpunkte pro Ring, acht Ringe und 20 Ausgabebauten; die Testseite verwendet 16.
- Ein geografischer Mercator-Ursprung am gewählten Event transformiert lokale Meter in **Ost / oben / Süd**. Dieselbe Matrixkonvention wird im vorhandenen Importlabor verwendet. Keine künstliche Zentrierung oder Verschiebung der Gebäude.
- Seeds entstehen aus `osm_id`, wenn vorhanden, sonst der Feature-ID; der Generator besitzt einen kanonischen Geometrie-Hash als Rückfall. Die Live-Testseite verlangt zusätzlich Feature-IDs. Grundriss-Reihenfolge, Startpunkt und Laufrichtung verändern das Ergebnis nicht. Ein upstream geänderter/neu vergebener Bezeichner kann die Variante ändern.
- `querySourceFeatures` liefert nur geladene Tiles und kann Grundrisse teilen. Identische Dubletten werden zusammengefasst; erkennbare widersprüchliche Fragmente werden verworfen. Ein einzelnes, unbemerkt abgeschnittenes Fragment lässt sich über diese öffentliche API nicht zuverlässig als vollständig erkennen. Für eine stadtweite Fassung werden vollständige Footprints und stabile OSM-IDs benötigt.

### Erzeugte Details und Grenzen

- Fenster-/Geschossraster mit ungefähr 3,25 m Geschosshöhe, angepasstem Achsabstand, Rahmen, Mittelstegen, Fensterbänken, Sockel-/Geschosslinien und Kantenabdunklung. Alle Fenster liegen als Shader-Muster direkt auf ihrer geografisch ausgerichteten Wand; keine einzelnen Fenster-DOM-Elemente oder Fenster-Meshes.
- Deterministische Putz-/Ziegelvarianten, ruhige mineralische Farben und warme, verstreut beleuchtete Fenster. Kein Bloom, Neon oder nachträglich aufgeklebtes Luftbild als Fassadenfoto. Die Fensterbeleuchtung ist eine Simulation und keine Aussage über reale Bewohner oder Nutzung.
- Flache und ausdrücklich als `gabled` getaggte rechteckige Satteldächer. Die Gesamthöhe bleibt erhalten. Unbekannte, komplexe und nicht unterstützte Dachformen bleiben flach; fehlende Dachinformationen werden nicht als amtlich bekannt ausgegeben.
- Balkone nur bei explizit erkennbarer Wohnnutzung. Fehlende OSM-Tags werden nicht durch eine Wohnnutzungsbehauptung ersetzt. Einfache gemeinsame Quadergeometrie für Platte und Brüstung; höchstens 72 Balkone auf reduziertem Gerätebudget beziehungsweise 180 auf dem Desktop-Budget.
- Erdgeschoss-Eingänge und gelegentliche Schaufenster sind Teil des Shader-Musters; eine tatsächlich bekannte Straßenfassade oder genaue Eingangslage ist daraus nicht ableitbar.
- Gerichtete Flächenbeleuchtung und subtile Materialabdunklung erzeugen Tiefe. **Keine echten geworfenen Gebäudeschatten**, keine Photogrammetrie, keine gemessenen Fassaden, kein vollständig erfasstes LoD2-/LoD3-Modell.

### Rendering und Ressourcen

- Eine Szene und ein Renderer teilen den vorhandenen MapLibre-WebGL-Kontext. Kein zusätzlicher Canvas und kein Szenenneuaufbau bei Zoom, Drehung oder Testflug.
- Maximal drei zusätzliche Zeichenaufrufe: gebatchte Wände, Dächer und instanzierte Balkone. Gemeinsam genutzte Shader/Materialien; keine Fassaden-Bildtexturen oder separaten Texturdownloads.
- Ab Zoom 15,4 sind Fenster aktiv; Balkone erst ab Zoom 17 und im nahen Umfeld. Bei größerer Entfernung bleibt die einfachere Darstellung. Wiederholt langsame Bewegungsframes deaktivieren die Balkoninstanzen für die Sitzung. Mobile Bildschirmauflösung ist auf DPR 1,5 begrenzt.
- Ein einzelner neuer Testflug unterbricht den vorherigen mit `map.stop()`. Keine Kamerawarteschlange. Reduced Motion setzt die Zielansicht unmittelbar und deaktiviert animierte Vergleichsmessungen. Hintergrundwechsel und manuelle Interaktion beenden laufende Messungen.
- Die Szene erzeugt keinen eigenen kontinuierlichen Repaint-/RAF-Loop. MapLibre rendert bei Kartenbewegung oder einer echten Darstellungsänderung.
- Geometrien, Materialien, Instanzressourcen, Renderer, Beobachter und Listener werden beim Entfernen/Verlassen freigegeben. Der geteilte WebGL-Kontext wird nicht durch den Fassaden-Layer zerstört.
- Nach WebGL-Kontextverlust wird erst nach MapLibres erneutem `style.load` rekonstruiert, nicht in eine noch ungeladene Karte geschrieben.

## Vorher/Nachher und Tests

Die Browsernachweise, Screenshots und Messwerte stehen unter [facade-comparison](facade-comparison/README.md). Sie verwenden synthetische Grundrisse und Chromium mit SwiftShader-Software-Rendering. Der mobile Viewport ist eine Touch-/Layout-Prüfung, **kein physisches iPhone**. Render-Ereignisse pro Sekunde sind keine gemessene GPU-Zeit. JavaScript-Heap und die ausgewiesenen Geometriebytes umfassen nicht den gesamten GPU-, Tile- oder Browser-Speicher.

Die Entwicklungsumgebung blockiert den direkten OpenFreeMap-Zugriff mit `CONNECT 403`. Daher ist kein erfolgreicher Live-Berlin-/Luftbildtest belegt. Der Fehlerpfad wurde zusätzlich mit absichtlich blockierten Diensten geprüft. Er zeigt einen Fehler und ersetzt die fehlenden Daten nicht durch unbeschriftete Fantasiegebäude.

Die automatischen Unit-/Regressionstests werden mit `npm test`, die Typprüfung mit `npm run typecheck` und der Produktionsbuild mit `npm run build` ausgeführt. Der bisherige Startscreen-/Chat-/Tour-/Modellimport-Testbestand bleibt enthalten. Der Build erzeugt weiterhin den vorhandenen statischen Export; Deployment-Konfiguration ist unverändert.

## Rechte und Hosting

Die ursprünglichen Quellenvermerke für OpenFreeMap, OpenMapTiles und OpenStreetMap bleiben erhalten; für Luftbilder wird die bestehende Geoportal-Berlin-Integration einschließlich Attribution weiterverwendet. OSM-Daten stehen unter [ODbL](https://www.openstreetmap.org/copyright); bei einer späteren Veröffentlichung sind insbesondere Attribution und gegebenenfalls Pflichten für abgeleitete Datenbanken zu berücksichtigen. Der Prototyp lädt keine fremden Fassadenfotos oder 3D-Mesh-Assets und führt kein eigenes Tile-Scraping oder persistentes Offline-Archiv ein. Es gelten weiterhin die Nutzungs-/Cachingbedingungen der vorhandenen Dienste. Die Prüfszene besteht aus eigens generierten, nicht amtlichen Testgrundrissen.

## Vorschlag für die nächste Stufe – erst nach Freigabe

1. Auf einem echten iPhone/Safari mit zugänglichem Live-Kartendienst denselben Vergleich messen. Architekturwirkung und Kosten der Fragmentshader anhand realer Gerätemessungen beurteilen.
2. Einen vollständigen, räumlich begrenzten OSM-/amtlichen Footprint-Datensatz mit stabilen IDs und Gebäudenutzung bereitstellen. Geteilte Vector-Tile-Ränder vor der Detailerzeugung auflösen; Roof-/Material-Tags nur bei tatsächlich vorhandenen Informationen nutzen.
3. In einem Worker pro räumlichem Block vorbereiten und nach stabilem Geometrie-/Versionshash wiederverwenden. Begrenzten LRU-Speicher und selektive Tile-Abdeckung verwenden; keinen Renderer pro Haus und kein stadtweites Vorladen.
4. LOD an projizierte Gebäudegröße koppeln: entfernte Gebäude als vorhandene Extrusion, mittlere Entfernung Shader-Fassaden, nahe geeignete Bauten zusätzliche Instanzen. Übergabe zwischen Darstellungen erst nach vorbereiteter Geometrie, ohne asynchrones Umschreiben des Live-Sourcefilters bei jedem Kameraschritt.
5. Erst nach Live-/iPhone-Nachweis und Seans Freigabe eine optionale Integration in die Hauptkarte vorbereiten. Dieser Prototyp allein rechtfertigt weder eine stadtweite Leistungszusage noch eine Behauptung fotorealistischer Berliner Architektur.
