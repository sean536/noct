# NOCT – echte texturierte Berliner Gebäude

Stand: 20. Oktober 2026. Untersuchte App: Git-Stand `d961cfbe4b276540d161886b3fb2d8e3563ce8bc`.

## Ergebnis und Status

Ein fachlich passender Datensatz existiert: das offizielle **3D-Meshmodell Berlin, Befliegung 2025**, mit OBJ-Geometrie und Bildtexturen. Die kommerzielle Nutzung und das eigene Hosting dieser konkreten Dateien sind hier jedoch **noch nicht verifiziert**. Der aktuelle Katalog verweist auf separate Bedingungen; „kostenfrei herunterladbar“ reicht als Lizenznachweis nicht aus.

**Es wurde kein texturiertes Modell in die App eingebaut und kein funktionierender Mesh-Prototyp fertiggestellt.** Der Downloadzugriff dieser Arbeitsumgebung ist gesperrt. Es wurden keine künstlichen Fassaden, generischen Beispielgebäude oder Screenshots als Berliner 3D-Daten eingesetzt. Die bestehende App, Hauptkarte, Gebäude, Kameratour, Events, Chat und Merkliste bleiben unverändert.

## Warum die vorhandenen Gebäude Blöcke sind

Die App verwendet MapLibre GL JS **5.20.0**. `lib/buildings.ts` bezieht OpenFreeMap-Vektordaten mit OpenMapTiles-Gebäudeattributen aus OSM. Die Ebene `real-buildings` ist eine `fill-extrusion`: Sie extrudiert Gebäudeumrisse anhand von `render_height` und `render_min_height`. Diese Höhen sind Anbieterableitungen, keine durchgängig vermessenen Gebäudemodelle.

Die gelblich wirkende Darstellung kommt aus den warmen Materialfarben und dem warmen Richtungslicht. Die vorhandene Ebene ist vollständig deckend (`fill-extrusion-opacity: 1`). Sie enthält weder UV-Koordinaten noch Fassadenbilder, Fenstergeometrie oder ausmodellierte Dächer. Die Geoportal-Luftbilder sind eine separate Bodenebene; sie erzeugen keine Fassaden. Längeres Vorladen, höhere Bildschirmauflösung oder eine andere Farbe kann diese fehlenden Modelldetails nicht ergänzen.

## Datenvergleich

| Kandidat | Tatsächlich belegt | Rechte und Zugriff | Bewertung für NOCT |
| --- | --- | --- | --- |
| Berlin 3D-Meshmodell 2025 | Offizielles, aus Multiperspektiv-Luftbildern rekonstruiertes Stadtmesh; OBJ-Kacheln mit Texturen | Kostenfreier Download laut Anbieter. Katalog-Lizenzfeld: `other-closed` / „Siehe Website des Datensatzes“. Separate aktuelle Bedingungen hier nicht lesbar abrufbar; Downloadhost in der Arbeitsumgebung gesperrt | **Bevorzugter Prüfungskandidat**, noch keine Freigabe für kommerzielle Weiterverteilung oder Hosting |
| Texturiertes Berlin-LoD2, Stand 2013/2014 | Amtliche Beschreibung bestätigt modellierte Hauptdachformen und Texturen aus Schrägluftbildern 2013 | Historischer Downloadverweis; aktuelle Verfügbarkeit und Rechte für genau dieses Paket nicht bestätigt | Mögliche Alternative, deutlich älter. Historische Aussagen zu Nutzungsrechten nicht auf das Mesh 2025 übertragen |
| Aktuelles amtliches Berlin-LoD2 | Katastergetreue Grundrisse, generalisierte Standarddachformen; Katalog nennt `dl-de-zero-2.0` | Offene Lizenz im konkreten Katalogeintrag. Dort kein Nachweis realer Fassadentexturen | Geometrieverbesserung möglich, **kein belegter Ersatz für texturierte Gebäude** |
| Digitales 3D-Innenstadtmodell | Aus Grundrissen und Geschosszahlen erzeugte Blöcke; einzelne prägende Objekte detaillierter; DWG in EPSG:3068 | Eigene Nutzungsbedingungen und Quellenvermerk | Erfüllt das Fassaden-/Texturziel nicht |
| MeinXhain 3D | Öffentlicher 3D-Viewer für Friedrichshain-Kreuzberg | Sichtbarkeit im Viewer belegt keine Rechte zum Extrahieren oder eigenen Hosten der zugrunde liegenden Assets | Vergleichsquelle, kein hier freigegebener Asset-Lieferant |

`other-closed` ist hier der tatsächliche Metadatenwert, **kein Beweis, dass kommerzielle Nutzung verboten ist**. Entscheidend ist der verlinkte Lizenztext für die heruntergeladenen Geometrien **und** Texturen. Aus Suchtreffern anderer Datensätze lässt sich keine CC-BY-Lizenz für das Mesh ableiten.

## Konkreter Zugriffsversuch

Der aktuelle Katalog verlinkt auf:

https://www.businesslocationcenter.de/berlin3d-downloadportal/resources/terms/terms.de.html

Beim unabhängigen Abruf lieferte dieser Link einen **Wartungshinweis** („Wartungsarbeiten an der Anwendung“, Downloadportal derzeit nicht verfügbar), keinen Lizenztext. Weitere Abrufe waren im Recherchewerkzeug nicht zugänglich. Auch die alternative Adresse auf dem Downloadhost war dort nicht lesbar. Davon getrennt ist die Netzwerksperre der Entwicklungsumgebung; deren direkter Versuch:

```text
curl --head --max-time 20 https://download-berlin3d.virtualcitymap.de/resources/terms/terms.de.html
HTTP/1.1 403 Forbidden
curl: (56) CONNECT tunnel failed, response 403
Exit-Code: 56
```

Das ist eine **Netzwerksperre dieser Arbeitsumgebung**. Sie beweist weder einen Fehler in NOCT noch die Nichterreichbarkeit des Portals auf einem normalen Gerät. Es wurden keine alternativen Proxys oder fremden Kopien zur Umgehung verwendet. Es liegt deshalb keine heruntergeladene Mesh-Kachel vor; Dateigröße, Texturauflösung, Koordinatenbezug und tatsächliche Darstellungsqualität wurden nicht gemessen.

Die amtliche Downloadanleitung beschreibt Gebietsauswahl, Bestätigung der Anbieterbedingungen und anschließenden Kacheldownload. Keine unbekannten Bedingungen wurden für den Nutzer angenommen.

## Getrennter Prototyp: vorgesehener Integrationsweg

**Testgebiet:** bestehende Eventlocation Berghain, ungefähr **13.44304° E, 52.51117° N**, maximal ein kleiner Gebäudeblock. Die Koordinate stammt unverändert aus den vorhandenen Eventdaten. Eine Stadtweite-Konvertierung ist für diesen ersten Vergleich unnötig.

**MapLibre behalten.** Die installierte Version unterstützt eine eigene WebGL-Ebene mit `renderingMode: '3d'`, gemeinsamem Tiefenpuffer und `onAdd`/`render`/`onRemove`. Damit ist eine Three.js-Integration grundsätzlich möglich, ohne die Kartenengine oder die Hauptkamera zu ersetzen. Das ist ein belegter API-Vertrag, **noch kein Nachweis eines funktionierenden Berlin-Modellimports**.

Nach rechtlich geklärtem Zugriff auf eine konkrete Kachel:

1. OBJ, Materialdateien, Texturen, Metadaten und Lizenz zusammen prüfen; keine Texturen anhand ihres öffentlichen URLs allein übernehmen.
2. Kleines Gebiet ausschneiden und offline nach glTF/GLB aufbereiten. Herkunft, Bearbeitung, Lizenz und Prüfsumme am Asset festhalten. Keine flache Luftbildtextur als echte Fassade ausgeben.
3. Quell-CRS, Einheit, Achsen, Tile-Ursprung und Höhenbezug aus den tatsächlichen Metadaten bestimmen. Keine pauschale Annahme „EPSG:25833“ und kein frei geschätzter Höhenversatz. Horizontale und vertikale Transformation sowie Kontrollpunkte dokumentieren.
4. Mit lokalem metrischem Ursprung und MapLibres `MercatorCoordinate` positionieren; der metrische Maßstab hängt vom Breitengrad ab. Die Modellebenen müssen Boden, Ausrichtung und echte Gebäudeumrisse treffen. MapLibres Modellaltitude und amtliche NHN-Höhen dürfen nicht ungeprüft gleichgesetzt werden.
5. Separaten Vergleichsviewer laden, nicht die Hauptkarte ändern. Im Vergleichsgebiet OSM-Extrusionen nur für den Mesh-Modus ausblenden, um doppelte Dächer und Tiefenflimmern zu vermeiden. Bei Lade-, Textur- oder WebGL-Fehlern wieder die vorhandenen Extrusionen zeigen.
6. Nur bei erfolgreichem Vergleich und nach ausdrücklicher Freigabe in die Hauptkarte integrieren. Bis dahin bleiben deren Dateien und Verhalten unangetastet.

## iPhone und Hosting

Dies sind **geplante Maßnahmen und Prüfkriterien**, keine bereits erreichten Leistungswerte:

- Nur eine kleine, optimierte Kachel laden; Three.js erst im getrennten Viewer laden. Keine neue Bibliothek im Startpfad der App.
- Mesh reduzieren, Texturatlanten und Mipmaps verwenden; auf ein nachvollziehbares Textur-/GPU-Speicherbudget achten. Fotoauflösung nicht durch erfundene Texturen ersetzen.
- Materialien und Geometrien wiederverwenden, unnötige Draw Calls und teure Echtzeitschatten vermeiden. Ressourcen und Listener beim Entfernen der Ebene freigeben.
- Bei KTX2/komprimierten Texturen nur vom Gerät unterstützte Formate verwenden; zusätzliche Decoder und deren Kosten im Prototyp messen. Nicht bereits als implementiert voraussetzen.
- Assets vorzugsweise auf demselben Ursprung wie der Viewer bereitstellen, sofern die Lizenz das erlaubt. Bei externem Hosting müssen Mesh, Texturen und Decoder korrektes CORS sowie MIME-Typen liefern. Auch ein lizenzkostenfreier Datensatz erzeugt Speicher- und Übertragungskosten; deren Höhe hängt vom tatsächlich aufbereiteten Asset ab.
- HTTP-Caching und Konvertierung/Weiterverteilung erst nach Prüfung der konkreten Datenbedingungen konfigurieren. Kein undokumentiertes Scraping des 3D-Viewers und kein Offline-Massencache fremder Tiles.
- Auf echtem iPhone Downloadbytes, Zeit bis zum vollständig texturierten Modell, Bildrate beim Schwenken und Speicherverhalten prüfen. Aktuell sind **keine gemessenen iPhone-, GPU- oder Ladezeitwerte** für das Mesh vorhanden.

Ein Luftbildmesh kann echte Dach- und Fassadenansichten abbilden, besitzt aber typischerweise Verdeckungen, unscharfe Fassaden oder Rekonstruktionsfehler. Sichtbare Fenster können im Bild liegen statt einzeln modelliert zu sein. Ob die konkrete Berghain-Kachel die gewünschte Qualität liefert, muss der Vergleich zeigen; „fotorealistisch“ ist derzeit keine verifizierte Eigenschaft unseres Prototyps.

## Was für den ausführbaren Vergleich noch fehlt

Benötigt wird eine kleine originale Kachel des Testgebiets mit allen Texturen/Materialien, Koordinatenmetadaten und den dazugehörigen aktuellen Nutzungsbedingungen. Alternativ muss die Entwicklungsumgebung regulären Zugriff auf den offiziellen Downloadhost erhalten. Erst dann lassen sich kommerzielle Nutzung, eigene Bereitstellung und die echte Renderqualität dieses Assets abschließend prüfen.

Bis dahin wird weder eine kostenpflichtige API aktiviert noch die Hauptkarte umgestellt. Eine generische Three.js-Testszene wäre kein erfolgreicher Prototyp mit echten Berliner Gebäuden und wird hier nicht als solcher angeboten.

## Quellen und Nachprüfbarkeit

Abgerufen am 20.10.2026. Aktuelle Katalogeinträge haben Vorrang vor historischen Beschreibungen und Suchvorschauen.

1. [Offizielles Downloadangebot, Befliegung 2025, OBJ und Texturen](https://www.businesslocationcenter.de/downloadportal/)
2. [Aktueller Datensatz und separater Lizenzverweis](https://daten.berlin.de/datensaetze/3d-meshmodell-berlin)
3. [Offizielles Downloadportal](https://download-berlin3d.virtualcitymap.de/?lang=en)
4. [Amtliche Anleitung: Gebietsauswahl und Anbieterbedingungen](https://gdi.berlin.de/data/applications/docs/Berlin_3D_Downloadportal.pdf)
5. [Amtliche Beschreibung des texturierten LoD2 von 2013/2014](https://fbinter.stadt-berlin.de/fb_daten/beschreibung/lod2.html)
6. [Aktueller amtlicher LoD2-Datensatz mit Lizenzfeld](https://daten.berlin.de/datensaetze/3d-gebaudemodelle-im-level-of-detail-2-lod-2-3c7c49af)
7. [Digitales 3D-Innenstadtmodell: Herstellung und DWG-Raumbezug](https://www.berlin.de/sen/stadt/stadtdaten/stadtwissen/digitale-innenstadt/3d-modell/)
8. [MeinXhain 3D](https://meinxhain3d.de/)
9. [MapLibre: CustomLayerInterface, Quellcode der installierten Version 5.20.0](https://github.com/maplibre/maplibre-gl-js/blob/v5.20.0/src/style/style_layer/custom_style_layer.ts)

Lokal geprüfte Verträge: `node_modules/maplibre-gl/src/style/style_layer/custom_style_layer.ts` und `src/geo/mercator_coordinate.ts`. Keine Änderung an Dependencies oder Anwendungscode.

Die unabhängige Gegenprüfung bestätigte Datensatz, Lizenzlücke, Netzwerkblock, API-Vertrag und unveränderten Anwendungscode. Gesamturteil: **teilweise bestätigt**; die entscheidenden Fragen nach konkreten Dateirechten und echter Renderqualität bleiben offen.

## Technische Abschlussprüfung der Machbarkeitsprüfung vor der GitHub-Migration

Die folgenden Aussagen beschreiben den Prüfstand vor dem ergänzenden Migrations- und Branch-Setup. Die zusätzlichen Dokumentationsdateien der anschließenden Übertragung sind in `MIGRATION.md` beschrieben.

- `npm test`: 12 Testdateien bestanden, 0 fehlgeschlagen.
- `npm run typecheck`: Exit-Code 0.
- `npm run build`: Exit-Code 0. Der erste Lauf scheiterte an einer gesperrten lokalen Portbindung des Turbopack-Buildprozesses; mit Netzwerkberechtigung für den Build war der unveränderte Anwendungscode erfolgreich kompilierbar. Das ist kein Karten- oder Modellfehler.
- `git diff --exit-code d961cfbe4b276540d161886b3fb2d8e3563ce8bc` für alle bestehenden Projektdateien: keine Änderungen. Neu ist ausschließlich dieser Bericht.
- Kein tatsächlicher Mesh-Render-, Georeferenzierungs- oder iPhone-Test möglich, da keine geeignete Kachel vorliegt. Kein Vorher-Nachher-Leistungsgewinn behauptet.
