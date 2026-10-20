# NOCT – Fassaden in der vollständigen Webapp

Stand 20.10.2026, Branch `feature/noct-3d`. Der vorhandene prozedurale Generator ist jetzt mit der Hauptkarte unter `/` verbunden. Keine Veröffentlichung und kein Merge nach `main`. Die isolierten Prototyp-Routen bleiben für Vergleiche erhalten.

## Umfang

Nur die Gebäudedarstellung wurde angeschlossen. `app/page.tsx`, `app/globals.css`, Chat, Events, Navigation, Merkliste und die Dateien `camera-plan.ts`, `scene-flight.ts` und `tour.ts` sind gegenüber dem Ausgangsstand unverändert. Auch die JSX-Oberfläche von `CityMap.tsx` wurde nicht verändert. Die Änderung dort besteht aus dem Gebäude-Paint-Ausdruck, dem optionalen Renderer-Anschluss und dessen Lebenszyklus.

- `lib/facade-state.ts`: Der bestehende Gebäudelayer liest den Zustand `noct_facade_ready`. Nur ein vorbereitetes Gebäude wird auf Extrusionshöhe null gesetzt; alle anderen behalten ihre ursprüngliche Datenhöhe. Keine Änderung an Source-Filtern, Datentiles, Licht, Luftbildern oder Kameraparametern. Andere Feature-State-Schlüssel werden nicht angerührt.
- `lib/facade-map.ts`: Liest die bereits geladenen Features aus `buildings` / `building`, prüft Identitäten und verwendet den vorhandenen Generator. Keine neuen Gebäudedienste, keine neuen Netzwerk-Endpunkte, keine künstlichen Grundrisse in der Hauptkarte. Identitätskonflikte und fehlende beziehungsweise ungeeignete Daten bleiben beim ursprünglichen Fallback.
- `prototypes/facades/layer.ts`: Der vorhandene Three.js-Layer behält einen Renderer und den gemeinsamen WebGL-Kontext. Nur der kleine Geometriebatch wird ausgetauscht. Shader werden vor der Umschaltung vorbereitet; bei Fehlern werden die ursprünglichen Gebäude wiederhergestellt.
- `prototypes/facades/data.ts`: Die bisherige LOD-Funktion erhält einen optionalen Balkon-Grenzwert. Die Hauptkarte verwendet 16,5 statt des Laborwerts 17, damit Details zur **unveränderten** Tour-Zoomstufe 16,6 passen. Die Labor-Standardeinstellung bleibt bestehen.

## Darstellung und Leistung

Fenster, Rahmen, Materialien, Fensterbänke, Eingänge und warme Lichtmuster stammen aus dem vorhandenen Shader. Balkone werden nur mit geeigneten Wohnnutzungsinformationen erzeugt. Satteldächer benötigen unterstützte Dachinformationen und passende rechteckige Grundrisse. Falls die Vektorkachel diese Tags nicht enthält, werden sie nicht erfunden. Fassaden bleiben prozedurale Interpretationen; keine fotografisch erfassten Berliner Fassaden.

Im direkten Umfeld werden auf reduziertem Gerätebudget höchstens **12**, sonst **20** geeignete Gebäude detailliert. Weiter entfernte und nicht unterstützte Gebäude bleiben die bisherigen Extrusionen. Maximal drei zusätzliche Draw Calls pro Batch, instanzierte Balkone und keine Fassaden-Bildtexturen. Der vorhandene Generator reduziert Balkone unter anhaltender Last. Die Kartenauflösung und die Kameraeinstellungen der App bleiben unverändert.

Aktualisierung nur bei geänderten Gebäude-IDs, Grundrissen, Höhen oder relevanten Tags, höchstens nach einem zusammengefassten 750-ms-Intervall. Reine Kameraframes mit unverändertem Batch bauen keine neue Geometrie auf. Kein eigener Dauer-RAF-Loop, kein zweiter Karten-Canvas und kein Renderer pro Haus. Bei niedrigerem Zoom, großer Entfernung, Hintergrundwechsel oder Fehlern werden die Ersatz-Zustände aufgehoben. Entfernen der Karte löscht Timer, Listener und Render-Ressourcen.

MapLibre liefert bei `querySourceFeatures` bereits geladene, möglicherweise geteilte Vektorkachel-Geometrie. Erkennbare widersprüchliche Fragmente/IDs werden verworfen; die öffentliche API garantiert keine vollständigen, ungeclippten Gebäude. Eine einzelne unerkannte Teilgeometrie bleibt eine Datenquellen-Grenze. Keine Behauptung einer flächendeckenden oder amtlich erfassten 3D-Rekonstruktion.

## Tatsächlich geprüft

- Gesamter vorhandener Testbestand einschließlich Modellimport, Startscreen, Chat, Events, Verkehr, Kamera-/Toursteuerung bestanden: **19 Testdateien** im Suite-Lauf.
- Zusätzlich direkt ausgeführt: **acht Integrationsprüfungen** für gültige Style-Spezifikation, selektiven Feature-State, Rollback, Wiederverwendung, niedrigen Zoom, fehlende Daten, widersprüchliche IDs und Rendererfehler.
- TypeScript (`npm run typecheck`) und Produktionsbuild (`npm run build`) bestanden. Die vollständige App und beide Prototyp-Routen sind im statischen Export enthalten.
- Vollständige Root-App in Chromium/SwiftShader geprüft, mit kontrollierten **synthetischen MVT-Testkacheln** an den vorhandenen Eventkoordinaten und einem ausdrücklich nur im Test abgefangenen Rasterbild. Diese Testdaten befinden sich nicht im Produktions-Datenpfad.
- Echte WebGL-Zeichenaufrufe des Fassaden-Shaders während der bestehenden automatischen Tour bestätigt: sowohl Desktop als auch Touch-Viewport 390 × 844. Auch Balkon-Instancing wurde ausgeführt. Dies belegt Rendering im vollständigen App-Code, keine iPhone-FPS.
- Quick-Reply → Chatantwort/Empfehlungen, alle sieben Eventkarten, Eventdetails, Speichern, Merkliste und Persistenz nach Neuladen erfolgreich. Ein absichtlich nicht ladbares optionales Fassadenmodul lässt die bestehende Karte und den Chat weiterhin nutzbar. Keine JavaScript-/Shaderfehler im erfolgreichen Lauf.

Der Live-Tiledienst `https://tiles.openfreemap.org/planet` wird in dieser Cloudumgebung weiterhin mit **CONNECT 403** abgewiesen. Daher sind echte geladene Berliner Tiles, das tatsächliche Angebot an Nutzungs-/Dachtags und die Leistung auf einem physischen iPhone **noch nicht bestätigt**. Der Browser-Test verwendet dasselbe MVT-/MapLibre-Verfahren mit kontrollierten Antworten; er ist kein Ersatz für diesen Live-Nachweis. Die öffentliche Website wurde nicht als Testziel verändert.

## Interaktive Vorschau – konkreter technischer Stand

Die integrierte vollständige App wurde für QA auf einem internen HTTP-Port gestartet. In dieser Sitzung ist kein Werkzeug zur externen Portfreigabe beziehungsweise zum Öffnen eines freigegebenen Codex-Vorschau-Tabs verfügbar. Eine Cloud-Loopback-Adresse ist kein für Sean erreichbarer Link.

Die vorhandenen Sites-Werkzeuge können die aktuelle öffentliche NOCT-Instanz veröffentlichen; diese Instanz darf hierfür ausdrücklich nicht verwendet werden. Für ein **getrenntes privates Vorschauprojekt** fehlt in der Arbeitsumgebung der zum unterstützten Source-/Publishing-Ablauf gehörende `site-workflow.mjs`-Helper. Es wurde kein neuer Site-Datensatz angelegt und keine erfolgreiche Veröffentlichung behauptet. Keine PDFs oder Screenshots werden als Ersatz für eine interaktive Vorschau angeboten.

Sobald die Vorschau-/Publishing-Funktion in einer geeigneten Codex-Umgebung verfügbar ist, ist der Ablauf:

1. Den geprüften Stand von `feature/noct-3d` übernehmen; keine Änderungen oder automatischen Merges auf `main` oder `design/noct-apple`.
2. Ein **eigenes, privates** Vorschauprojekt für die vollständige App auswählen/anlegen. Dessen Projekt-ID ausschließlich in einer getrennten Vorschau-Arbeitskopie hinterlegen. Die bestehende `.openai/hosting.json` und öffentliche NOCT-Zuordnung erhalten.
3. Aus genau diesem Quellstand `npm ci`, Tests, TypeScript und `npm run build` ausführen. Als statisches Verzeichnis den bereits bestehenden Next.js-Export **`out`** verwenden. Keine Architekturänderung, kein API-Key für die Standardkarte.
4. Nur dieses private Vorschauprojekt veröffentlichen, erfolgreiches Deployment bestätigen und Sean den vollständigen **Root-Link `/`** geben. Dort stehen App, Chat, Eventmarker und Tour gemeinsam bereit; nicht nur die Laborroute.
5. Im normalen Browser mit erreichbaren Geoportal-/OpenFreeMap-Diensten die echten Berliner Footprints und iPhone/Safari-Leistung prüfen. Die Entwicklungsumgebungs-Sperre erfordert gegebenenfalls eine Umgebungs-Netzfreigabe für diese Dienste, keine Umdeutung von Testkacheln als Echtdaten.
6. Erst nach gesonderter Freigabe durch Sean den geprüften Stand auf der öffentlichen NOCT-Instanz ausrollen. Kein automatischer Merge oder öffentlicher Rollout gehört zu diesem Auftrag.

Sean muss dafür lokal nichts installieren oder Befehle ausführen. Die private Vorschau ist mit dem aktuellen Auftrag angefordert; es fehlt die technische Bereitstellungsmöglichkeit. Eine spätere Freigabe zur öffentlichen Veröffentlichung ersetzt keine noch ausstehende Live-/Geräteprüfung.
