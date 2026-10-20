# NOCT – isolierter Gebäude-Import-Prototyp

Stand 20.10.2026. Branch **`feature/noct-3d`**, Ausgangsstand `9f834f3`. Die vorhandene NOCT-Oberfläche, Hauptkarte, Tour, Events und Funktionen bleiben unverändert.

## Status: technischer Viewer, reale Modellkachel fehlt

Neu ist eine eigene Testseite unter **`/prototypes/berlin-buildings/`**. Sie bereitet den Import eines kleinen, tatsächlich texturierten Gebäudeblocks vor. **Es ist kein echter Berliner Mesh-Datensatz enthalten.** Der Viewer ist kein erfolgreich geprüfter fotorealistischer Berlin-Prototyp. Ohne eigene geeignete Datei zeigt er die bisherigen OSM-Extrusionen über dem vorhandenen Luftbilddienst.

Das offizielle [Downloadportal](https://download-berlin3d.virtualcitymap.de/?lang=en) zeigte beim erneuten Abruf Wartungsarbeiten. Unabhängig davon blockiert die Entwicklungsumgebung direkte Anfragen an diesen Host mit CONNECT403. Der [aktuelle Datensatz](https://daten.berlin.de/datensaetze/3d-meshmodell-berlin) bestätigt OBJ plus Texturen aus 2025, verweist bei der Lizenz aber auf separate Bedingungen (`other-closed`). Der Lizenztext war erneut nicht lesbar erreichbar. Kommerzielle Nutzung, Bearbeitung und Hosting der konkreten Mesh-Dateien sind deshalb weiterhin **nicht verifiziert**, nicht als verboten eingestuft.

Die vorhandene Berliner LoD2-Recherche wird weiterverwendet: [Machbarkeitsbericht](../research/textured-buildings-feasibility.md). Keine Ersatzfassaden, generischen Stadtmodelle oder fremden Mesh-Kopien werden als echte Berliner Architektur eingesetzt. Der Nutzer hat bestätigt, dass noch keine lokale Modelldatei vorhanden ist.

## Starten und testen

```sh
git switch feature/noct-3d
npm ci
npm run dev
```

http://localhost:3000/prototypes/berlin-buildings/ öffnen. In der eingeschränkten Cloudumgebung für Installationen `npm ci --cache /workspace/.npm-cache` verwenden. Ein Modell wird nur lokal im Browser verarbeitet; Modell und Manifest werden nicht hochgeladen. Die Hintergrundkarte lädt weiterhin direkt Geoportal-/OpenFreeMap-Daten. Unter `/` bleibt NOCT wie bisher.

1. Standardgebiet ist die vorhandene Eventlocation Berghain; andere vorhandene Locations können ausgewählt werden. Es werden keine Eventdaten verändert.
2. Die Manifest-Vorlage herunterladen. Sie ist absichtlich **ungeprüft** und wird mit ihren Platzhaltern abgewiesen. Nur echte Metadaten und tatsächlich geprüfte Rechte eintragen.
3. Eine kleine, konvertierte GLB-Datei samt ausgefülltem JSON-Manifest wählen und „Lokal prüfen & laden“ betätigen. Es gibt keine mitgelieferte echte Modellkachel für diesen Schritt.
4. Mit „OSM vergleichen“ zwischen importiertem Modell und bisherigen Extrusionen wechseln. In dieser isolierten Ansicht werden die OSM-Gebäude im Modellmodus vollständig ausgeblendet, um Doppelgeometrie zu vermeiden. Eine spätere flächengenaue Integration in die Hauptkarte ist **nicht** implementiert.
5. „Testflug“ bewegt ausschließlich die Kamera der Testansicht. Er ersetzt oder verändert die echte NOCT-Tour nicht. Herkunft, Dateigröße, Vorbereitung, erster Zeichenaufruf, Draw Calls und Render-Takt erscheinen erst beim tatsächlichen Import/Rendern.

Ohne WebGL wird ein Fehler angezeigt. Bei fehlenden Kartentiles bleibt eine neutrale Fläche mit Datenfehlerhinweis; kein künstliches Luftbild. Die Modelleinfuhr wartet nicht auf sämtliche Hintergrundtiles, sondern auf die geladene Kartenstruktur. Fehlgeschlagene Modellimporte schalten auf den bestehenden OSM-Fallback zurück, dessen Sichtbarkeit ihrerseits vom Kartendienst abhängt.

Es wurde kein öffentliches Vorschau-Deployment auf die bestehende NOCT-Produktionsadresse veröffentlicht. Die Vorschau ist eine eigene lokale Route im Featurebranch; die bestehende Hosting-Zuordnung wurde nicht verändert.

## Erforderliche Asset-Aufbereitung

Das amtliche Rohformat ist laut Anbieter OBJ mit Texturen im ZIP. Der neue Viewer akzeptiert einen bewusst kleinen **statischen GLB-2.0-Teilumfang**; er ist kein OBJ-/CityGML-/3D-Tiles-Konverter. Nach wiederhergestelltem Datenzugriff muss eine echte Kachel offline geprüft, zugeschnitten und konvertiert werden.

- Quelle und aktuelle Bedingungen für Geometrie **und** Bilder sichern. Bearbeitung, kommerzielle Verwendung, Weitergabe/Hosting und erforderlichen Quellenvermerk prüfen. Keine privaten oder bezahlten Dienste ohne Zustimmung aktivieren.
- Quell-CRS, metrische Einheit, horizontale Ausrichtung, Höhenbezug und tatsächliche Bodenhöhe aus Metadaten und Kontrollpunkten bestimmen. EPSG:25833 oder eine Bodenhöhe werden nicht geraten.
- Konvertierter Modellrahmen: **X Osten, Y oben, Z Süden**, Meter, lokaler Ursprung. Vor dem Export die gemessene Bodenhöhe von den Quellhöhen abziehen: MapLibres vorhandene Luftbildkarte liegt auf einer flachen Null-Ebene, ohne Gelände. Die entfernte Höhe und der ursprüngliche Höhenbezug stehen im Manifest; keine ungeprüfte Gleichsetzung von NHN und Kartenaltitude.
- Ein kleiner Block, maximal 250m vom lokalen Ursprung, maximale Y-Höhe 200m, unterster Punkt innerhalb ±3m der vorbereiteten Bodenebene. Ursprung höchstens 300m vom ausgewählten Event entfernt. Das sind Schutzgrenzen für diesen Prototyp, keine Messungen Berliner Gebäude.
- Koordinaten werden nicht automatisch zentriert, skaliert oder auf die Eventposition geschoben. Die Tests belegen die Achsen-/Mercator-Transformation; erst reale Kontrollpunkte können die richtige Positionierung einer konkreten Kachel belegen.
- Geometrie, UVs, Bilder und Materialien vollständig in genau einer Szene einbetten. Keine externen Bild-/Buffer-URLs oder Data-URIs. PNG/JPEG; Dreiecksgeometrie; keine Animationen, Skins oder Morph Targets. Unterstützte Erweiterungen: `KHR_materials_unlit` und `KHR_texture_transform`.
- Draco, Meshopt, KTX2/Basis und andere Erweiterungen werden momentan ausdrücklich abgewiesen. Keine stillen Decoder-Downloads. Textur-/Geometriereduktion gehört zur Aufbereitung; Texturen nicht frei erfinden.

Vorabprüfung und Hash für das Manifest:

```sh
node --import tsx scripts/inspect-building-glb.ts /pfad/event-block.glb
```

Die Manifestfelder werden auf Vollständigkeit/Konsistenz geprüft. Wahrheitswerte zur Lizenz sind **deklarierte Angaben des Erstellers**, kein automatischer juristischer Nachweis. Für eine öffentliche Freigabe muss eine konkrete Datei separat rechtlich und visuell geprüft werden.

## Rendering und Ressourcen

MapLibre GL JS bleibt bei **5.20.0**. **Three.js 0.180.0** (MIT; Types ebenfalls gepinnt) wird erst beim Modellimport in dieser Route geladen. Der Hauptscreen importiert den Renderer nicht. Ein Custom Layer teilt den vorhandenen MapLibre-WebGL2-Kontext und Tiefenpuffer; eine Szene pro Import, keine Neuanlage je Kamerafahrt. Keine Schatten-/Postprocessing-Pässe, kein dauerhaftes Repaint oder eigener Animationsloop. Vorhandene GLB-Materialien werden übernommen; keine Fassaden-Rekolorierung als Qualitätsersatz.

| Grenze | Mobil / schwächere Geräte / Datensparmodus | Desktop |
| --- | --- | --- |
| Dateigröße | 12 MiB | 24 MiB |
| Bildkante | 2048 Pixel | 4096 Pixel |
| Geschätztes RGBA + Mipmap-Budget | 32 MiB | 64 MiB |
| Dreiecke | 160.000 | 300.000 |
| Primitive | 64 | 128 |
| Karten-Pixelratio maximal | 1,5 | 2 |

Diese konservativen Grenzen sind **keine iPhone-Leistungsgarantie** und passen nicht automatisch die Dateiqualität an; zu große Assets werden vor dem Renderer abgewiesen. JSON-/Objektanzahl, Bufferbereiche und Modellhierarchie werden ebenfalls begrenzt. Unbekannte Materialerweiterungen können die Prüfung nicht über fehlende `extensionsUsed`-Deklarationen umgehen.

SHA-256 bindet das ausgewählte Modell ans Manifest. Ein Import erhält eine asynchrone 12-Sekunden-Deadline für die kontrollierte Rückkehr. Synchrone JSON-, Geometrie- oder Loaderarbeit auf dem Hauptthread kann die Timer-Ausführung verzögern; das ist keine absolute Wandzeitgarantie. Ein schon laufender Browser-Decodierprozess kann dabei nicht garantiert abgebrochen werden; verspätet gelieferte Modelle werden freigegeben. Neue Imports ersetzen ausstehende alte, ohne Warteschlange. Geometrien, gemeinsame Materialien, Texturen und ImageBitmaps werden freigegeben; der gemeinsame WebGL-Kontext wird nicht verloren gegeben. GPU-/Browser-GC kann Ressourcen erst später tatsächlich zurückgewinnen.

Nach dem Decoder werden tatsächlich vorhandene Material-Texturen und Bilddimensionen erneut geprüft: Ein fehlgeschlagenes Bild darf nicht als erfolgreich texturiertes Modell erscheinen. Separate Texture-Objekte zählen auch bei gemeinsamem Quellbild jeweils zum Budget. Die Geometrie-Uploadschätzung zählt BufferAttribute-/InterleavedBuffer-Identitäten, nicht nur gemeinsam genutzte CPU-ArrayBuffer. Der Renderer passt den Viewport je Frame an den vorhandenen MapLibre-Zeichenpuffer an; er verändert dessen Canvasgröße nicht.

Kameratest respektiert reduzierte Bewegung; beim Wechsel in den Hintergrund wird die Bewegung gestoppt. Telemetrie wird gedrosselt aktualisiert. Render-Takt zählt MapLibre-Zeichenereignisse während Bewegung; erster Zeichenaufruf ist **kein GPU-Fence oder Vollständigkeitsnachweis**. Texturspeicher ist eine Schätzung für RGBA plus Mipmaps, nicht der gesamte GPU-/Prozessspeicher. Bilder werden im Parser vor dem Rendern vorbereitet; beim ersten Draw können trotzdem Shader-/Uploadkosten anfallen.

## Bisherige Verifikation und offene Punkte

Die neuen Kernverträge wurden mit beobachteten Rot-/Grün-Durchläufen getestet: Manifest, Ressourcen-/Texturprüfung, geografischer Achsenrahmen, Importersetzung/Timeout und Freigabe gemeinsam genutzter Ressourcen. Die Parser-/Three-Szenenfixtures sind synthetische **Unit-Testdaten**, keine öffentlichen Berliner Assets. Tatsächliche Abschlusschecks: [CHECKS.md](CHECKS.md).

Ein vollständiger Browser-/WebGL-Rendernachweis steht aus: In dieser Sitzung ist kein Browsersteuerungswerkzeug verfügbar. Ohne echte Modelldatei gibt es keine Berliner Textur-/Kontrollpunktprüfung, keine belastbare iPhone-FPS-, GPU-Speicher- oder Tile-Ankunftsmessung. Auch der Testflug in der Vorschau ist noch nicht auf einem echten Gerät beobachtet worden. Es wird kein Vorher-Nachher-Leistungsgewinn behauptet.

**Nächster Entscheidungspunkt:** reale kleine Mesh-Kachel samt Metadaten und Bedingungen beschaffen, Import und Vergleich im Browser/iPhone prüfen. Erst nach diesem Vergleich und ausdrücklicher Nutzerfreigabe die Hauptkarte verändern. Keine automatische Integration oder Merges nach `main`/`design/noct-apple`.
