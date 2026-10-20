# NOCT – Fassaden in der vollständigen Webapp

Branch `feature/noct-3d`, 20.10.2026. Die vollständige App ist separat unter https://noct-facades-test.tuned-cove-5285.chatgpt.site erreichbar (privat, Anmeldung mit dem Eigentümer-Konto). Die öffentliche NOCT-Website wird damit nicht aktualisiert. Kein Merge nach GitHub-`main`.

## Diagnose der zunächst kaum sichtbaren Fassaden

Die Integration in `9b71e19` wurde mit synthetischen Einzelpolygonen geprüft. Dabei fehlte eine Eigenschaft der tatsächlichen Datenarchitektur: Der OpenFreeMap-Datengenerator fasst Gebäude mit gleichen Attributen als **MultiPolygon** zusammen. Der bisherige Normalisierer akzeptierte nur einzelne Polygon-Features. Außerdem wurden mehrfach verwendete beziehungsweise fehlende Feature-IDs vollständig ausgeschlossen. Damit erreichten viele Grundrisse den Fassaden-Shader überhaupt nicht.

Nachweisbare Provider-Implementierung: [Building.java](https://github.com/openmaptiles/planetiler-openmaptiles/blob/main/src/main/java/org/openmaptiles/layers/Building.java) ruft in `postProcess` `FeatureMerge.mergeMultiPolygon` auf. [FeatureMerge.java](https://github.com/onthegomap/planetiler/blob/main/planetiler-core/src/main/java/com/onthegomap/planetiler/FeatureMerge.java) beschreibt die Zusammenfassung von gleich attribuierten Polygonen. Die [OpenMapTiles-Gebäudefelder](https://openmaptiles.org/docs/schema/#building) enthalten Höhen, Farbe und `hide_3d`; Nutzungs- und Dachinformationen sind dort nicht zugesichert.

Das war eine Lücke der früheren Tests. Erfolgreiche Shader-Zeichenaufrufe an synthetischen Häusern belegten nicht die ausreichende Aktivierung an diesem Providerformat.

## Gezielte Korrektur

- `prototypes/facades/data.ts`: Optionaler Oberflächenmodus zerlegt MultiPolygone in begrenzte Einzelgrundrisse. Fenster-/Materialvarianten sind an kanonische Grundrisse gebunden, unabhängig von Reihenfolge oder zusammengefasster Kachel-ID. Gleiche Geometrien werden dedupliziert. Der bisherige isolierte Prototyp behält seine Standardeinstellungen.
- `lib/facade-map.ts`: Verwendet diese Oberflächen für die bereits geladenen Daten von `buildings` / `building`. Keine neue Datenquelle und keine zusätzlichen Gebäude-Downloads. Unveränderte Geometrie bleibt auch bei geänderter Provider-Gruppen-ID im vorhandenen Renderer.
- `prototypes/facades/mesh.ts`: Fassaden überdecken nur die entsprechenden Außenwandflächen. Ein kleiner GPU-Tiefenoffset verhindert, dass die ursprünglichen, deckungsgleichen Extrusionswände die Fenster verdecken. Die Tiefenprüfung bleibt aktiv; davorliegende Gebäude verdecken rückwärtige Fassaden weiterhin korrekt. Der Oberflächenmodus rendert kein zweites Dach.
- `prototypes/facades/layer.ts`: Reicht diese bestehende Renderoption weiter; ein Three.js-Renderer und ein gemeinsamer MapLibre-WebGL-Kontext bleiben erhalten.

**Keine ganzen Kachel-Features werden mehr ausgeblendet.** Eine Feature-ID kann viele Gebäude enthalten, von denen nur einige in das Detailbudget passen. Die bestehenden Extrusionen bleiben deshalb als vollständige Geometrie, Dächer, Verdeckung und Fehler-Fallback erhalten. Es entstehen keine zweiten Gebäudekörper.

Fenster und warme Beleuchtung bleiben prozedural. Balkone werden weiterhin nur bei passenden Nutzungsinformationen erzeugt; fehlende Wohnnutzungsdaten werden nicht als tatsächlich vorhandene Balkone ausgegeben. Die zugrunde liegenden Dächer und Gebäudesilhouetten bleiben erhalten. Keine Behauptung fotografisch erfasster Fassaden.

## Grenzen und Kosten

Unverändert maximal **12** detaillierte Gebäude auf reduziertem/mobilem Gerätebudget beziehungsweise **20** sonst. Fenster bei Zoom ≥15,4, Hauptkarten-Balkongrenze 16,5, normale Tour-Zielzoomstufe 16,6. Keine Änderung an Kamera, Tourdauer, Perspektiven, Karten-DPR oder App-UI. Aktualisierungen bleiben auf das bestehende 750-ms-Intervall zusammengefasst. Keine eigenen Dauer-Animationen oder neuen Abhängigkeiten. Nicht unterstützte/fehlende Grundrisse und Höhen, Hintergrundtab, entfernter Zoom und Rendererfehler behalten den ursprünglichen Karten-Fallback.

QuerySourceFeatures liefert weiterhin kachelweise, unter Umständen geclippte Geometrie. Das ist keine vollständige Stadtmodell-Datenbank. Das Oberflächenverfahren kann Teilgrundrisse nutzen, ohne andere Teile einer Sammel-ID zu löschen; es rekonstruiert daraus keine unbekannten Fassaden, Dachformen oder fehlenden Daten.

## Tatsächlich geprüft

`tests/fixtures/berlin-weekend.json` enthält 20 unverändert geografisch positionierte Berliner LoD2-Grundrisse mit Höhen nahe dem bestehenden Weekend-Club-Eventgebiet. Quelle und unveränderlicher Git-Blob sind im Fixture dokumentiert. Datenlizenz: **Datenlizenz Deutschland – Zero – 2.0**. Die absoluten NH-Höhen `base_m` werden nicht als Höhe über Grund verwendet. Das Fixture gehört ausschließlich zu den Tests und wird nicht als Ersatzdatenquelle in die App eingebaut.

Für die MapLibre-Prüfung wurden diese realen Geometrien mit ihren Höhen in das dokumentierte MultiPolygon-/MVT-Format übersetzt. Es handelt sich um einen **Replay mit realen Berliner Geometrien**, nicht um einen frisch abgerufenen OpenFreeMap-Kachelbestand. Der Testhintergrund ist neutral, kein behauptetes echtes Luftbild.

| Messung desselben Ausschnitts | Bisher | Korrigiert |
| --- | ---: | ---: |
| Detaillierte Grundrisse Desktop | 3 | 20 |
| Detaillierte Grundrisse Mobilansicht | 3 | 12 |
| Zusätzliche Draw Calls in diesem Ausschnitt | 2 | 1 |
| Fassaden-Bildtexturen | 0 | 0 |

Die korrigierte Geometrie benötigt in diesem Ausschnitt ungefähr 63 KiB am Desktop beziehungsweise 41 KiB mobil. Das ist eine Szenenmessung, kein allgemeiner Speicherverbrauch der App. GPU-Renderzeit und physische iPhone-FPS wurden nicht gemessen.

Geprüft: sichtbare Fenster und warme Fensterlichter im identisch positionierten Vorher-/Nachher-Bildpaar, bestehende Zielzoomstufe 16,6 und schräge Desktop-/Mobilperspektiven, Zoom/Drehen und schnell aufeinanderfolgende Bewegungen, Original-Extrusionen als Fallback, Renderer-Wiederverwendung und Fehlerfälle. Zusätzlich vollständige Root-App: manuelle Eventauswahl, Eventdetails, Merkliste sowie Quick-Reply → Chatantwort/Empfehlungen. Keine beobachteten JavaScript-/Shaderfehler im erfolgreichen Browserlauf. Die UI-, Chat-, Event-, Marker- und Kameradateien wurden per Hash als unverändert geprüft.

Die Suite umfasst jetzt **20 Testdateien**, zusätzlich direkt ausgeführte symptombezogene Fassadentests. Produktionsbuild und TypeScript wurden für die Veröffentlichung geprüft. Die Browserläufe verwenden Chromium/SwiftShader und einen Touch-Viewport 390 × 844, kein physisches iPhone.

**Verbleibende Verifikationsgrenze:** Der direkte Abruf von `tiles.openfreemap.org` und Geoportal-Kacheln ist in dieser Entwicklungsumgebung durch die Netzwerk-Allowlist blockiert (CONNECT 403). Deshalb ist die Darstellung mit den aktuell live ausgelieferten Tiles hier nicht separat bestätigt. Das ist unabhängig davon, dass die verwendeten QA-Grundrisse echte Berliner Daten sind. Der Testwebsite-Browser lädt unverändert die normalen Live-Dienste.
