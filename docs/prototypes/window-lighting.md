# Living Berlin – Phase 2: dynamische Fensterbeleuchtung

Branch `feature/noct-3d`, Ausgangsstand: freigegebene Dächer `62f9909`. Dieser Stand wurde **vor Änderungen** als annotierter Tag `checkpoint/noct-roofs-phase1` auf GitHub gesichert. Zusätzlich liegt ein lokales Git-Bundle außerhalb des Projekts vor. Keine Änderungen an `main` oder am ursprünglichen NOCT-Deployment.

Vollständige interaktive Testapp:

- Nacht: https://noct-facades-test.tuned-cove-5285.chatgpt.site/?lighting=night
- Tag: https://noct-facades-test.tuned-cove-5285.chatgpt.site/?lighting=day
- Abend: https://noct-facades-test.tuned-cove-5285.chatgpt.site/?lighting=evening
- Ohne Parameter: automatische Beleuchtungssteuerung nach Uhrzeit in `Europe/Berlin`.

Keine zusätzliche Oberfläche und keine Verdunkelung der Luftbilder. Zum ruhigen Beobachten kann das vorhandene Texteingabefeld fokussiert werden; die bestehende Tour pausiert dabei wie zuvor. Über 30–60 Sekunden sind bei genügend sichtbaren Fenstern einzelne langsame Veränderungen zu erwarten; es gibt keinen garantierten Wechsel jedes bestimmten Fensters in einem kurzen Beobachtungszeitraum.

## Was tatsächlich zeitabhängig ist

`lib/window-lighting.ts` definiert die zentrale Uhr, Profile, stabile Integer-Hashes und eine CPU-Referenz für Tests. Der GPU-Teil (`lib/window-lighting-shader.ts`) berechnet Fenster-/Wohnungsidentitäten aus den bestehenden Wandkoordinaten und dem vorhandenen geografisch abgeleiteten Fassadenseed. Diese Identitäten hängen nicht von Kamera, Zoom oder Frame ab. Eine vollständige Datenbank eindeutiger OSM-Einzelgebäude ist dafür nicht erforderlich; die bestehende Quelle kann Gebäude als Sammel-MultiPolygone liefern.

Ungefähr **84 % der Identitäten** behalten ein statisches Muster. Etwa **16 %** können sich verändern. Kleine Gruppen von bis zu drei benachbarten Fenstern verwenden teilweise eine gemeinsame Wohnungsidentität; andere reagieren einzeln. Dies ist eine prozedurale Lichtsimulation, keine Information über tatsächliche Bewohner oder eingeschaltete Lampen.

Dynamische Identitäten erhalten individuell versetzte Intervalle von **64, 128 oder 256 Sekunden**. Bei einem neuen Intervall wird ein weiterer deterministischer Zielzustand berechnet. Er kann dem alten entsprechen; es wird also kein regelmäßiges An/Aus erzwungen. Tatsächliche Wechsel werden über **sieben Sekunden** weich überblendet. Unterschiedliche Phasen verhindern einen gemeinsamen Umschaltzeitpunkt. Es gibt weder pro Fenster ein JavaScript-Objekt noch einen eigenen Timer.

Die Uhr basiert auf realer Zeit. Sie wird als zwei kleine Shaderwerte übergeben: ein 512-Sekunden-Block modulo 4096 und die Sekunden innerhalb des Blocks. Das vermeidet große unpräzise Float-Zeitwerte. Vorheriger/nächster Zustand werden auch am Block- und langfristigen Modulo-Übergang konsistent berechnet. Die dynamische Folge wiederholt sich rechnerisch nach rund 24 Tagen; dieser Übergang erzeugt keinen globalen Lichtblitz. Neu laden oder Kamerabewegungen erzeugen keine neue Zufallsverteilung.

Statische Muster ändern sich nur mit dem zentralen Tagesprofil beziehungsweise einem expliziten Moduswechsel. Der automatische Modus verwendet eine sanfte feste Berliner Uhrzeitkurve, **keine astronomisch berechneten Sonnenstände oder Wetterdaten**. Die Dichtekurve bleibt auch um Mitternacht kontinuierlich. Tag: keine Emission; Abend/Nacht: warme Innenraumtöne zwischen Warmweiß und Bernstein. Vorhänge und geringe Innenraumhelligkeitsvarianten sind statisch, in der reduzierten Qualitätsstufe vereinfacht. Es gibt keinen Bloom-/Neon-/Disco-Effekt und keine animierten Dächer.

## Einbindung und Ressourcen

`lib/city-lighting.ts` steuert einen Zustand und höchstens **einen** Repaint-Timer für die gesamte Karte. Ruhende Nachtansicht: maximal ungefähr 12 Aktualisierungen/Sekunde am Desktop beziehungsweise 8 mobil. Während Kamerafahrten verwendet der Shader die bestehenden Kartenframes; der zusätzliche Timer bleibt aus. Dies ist ein Repaint-Takt, keine zugesicherte Bildrate.

Ohne aktive Gebäudekacheln, bei nahezu senkrechter Draufsicht und unter Zoom 15 werden keine eigenen Fenster-Animationsframes angefordert. Die zugrunde liegenden Fassaden werden dadurch nicht entfernt. Nicht sichtbare Flächen werden weiterhin durch die Karten-/GPU-Pipeline geclippt. Eine native `queryRenderedFeatures`-Abfrage prüft beim Stillstand zusätzlich, ob tatsächlich Gebäudegeometrie im Bildschirmbereich liegt. Das Ergebnis wird bis zur nächsten Kamerabewegung oder Gebäudedatenänderung zwischengespeichert; es gibt keine Einzelgebäude-Abfrage pro Frame. Auch nichtleere Quellkacheln ohne Gebäude im sichtbaren Ausschnitt lösen dadurch keinen eigenen Animationstakt aus.

Bei `document.hidden` wird der Timer gelöscht. Reduced Motion friert die Lichtuhr ein. Im automatischen Modus darf eine ruhende Ansicht weiterhin einmal pro Minute ihr Tagesprofil prüfen; explizite statische Tag-/Reduced-Motion-Nachtansichten benötigen keinen eigenen Timer. Bei Rückkehr in den sichtbaren Tab wird der aktuelle reale Zeitpunkt verwendet. Entfernen der Ebene räumt Timer und die zentralen Karten-/Media-/Visibility-Listener auf.

`lib/facade-tile-layer.ts` erhält nur die Lichtfunktionen und zwei Uniforms. Auf opaken Wandstellen, bei Tag und bei nicht mehr auflösbaren Fenstern überspringt der Shader die zusätzlichen Zufalls-/Lichtberechnungen. Feine Innenraumdetails respektieren das vorhandene adaptive Qualitätsbudget. Geometrie, Vertexlayout, Kacheldaten, Material-Caches, Dachzweig und Draw-Call-Zahl pro Frame bleiben erhalten. Keine zusätzlichen Fensterobjekte, Bilddownloads, Datenanbieter, Pakete oder kostenpflichtigen APIs.

Die acht vorhandenen nativen Fallback-Materialbilder bleiben **bytegenau im freigegebenen Phase-1-Zustand**. MapLibre verwendet dieses Muster auch auf Extrusionsdächern; eine globale Profiländerung würde daher ungefragt Notfalldächer mitändern. **Dieser Notfallmodus bleibt statisch und folgt auch nicht dem neuen Tagesprofil**, wenn der Custom-Renderer ausfällt. Es werden keine neuen oder ständig hochgeladenen Fenstertexturen verwendet. Der reguläre Custom-Renderer steuert Wände und Dächer getrennt.

## Prüfung und Grenzen

Der vollständige Root-Code wird mit den echten Berliner LoD2-Testgrundrissen und Höhen aus `tests/fixtures/berlin-weekend.json` geprüft: 95 Polygon-Komponenten, nach Kachelgrenzschnitt 100 Teile. Die Daten werden reproduzierbar als MVT abgespielt; Rastergrund neutral. Dies ist kein frisch abgerufener Live-Providerbestand. Die Testapp lädt im Nutzerbrowser weiterhin ihre bestehenden regulären Live-Quellen.

Geprüft werden tatsächliche Bildänderungen nach **realer Wartezeit**, getrennte projizierte Wand-/Dachmasken, Tag/Nacht, Stillstand, bestehende Eventflüge, Zoom/Drehen, unveränderte Geometrie-/Identitätsdaten, Reduced Motion und Abbruch am standardisierten Visibility-Signal. Das Visibility-Signal wird im Browsertest kontrolliert gesetzt; es ist kein physischer iPhone-Hintergrundtest. Bestehende Eventdetails, Merkliste und Quick-Reply/Chat werden weiter bedient.

Unit-Tests prüfen Verteilung, Mehrheitsstabilität, langsame Änderungen, kontinuierlichen Clock-Wrap, Tagesprofile, URL-Modi und einen einzelnen vollständig bereinigbaren zentralen Timer. Dach-/Geometrie-/UI-/Kamera-/Verkehrsdateien werden gegen den gesicherten Stand gehasht. TypeScript, vollständige Testsuite und Produktionsbuild gehören zur Freigabeprüfung.

Abschließender Lauf: **92/92 Tests bestanden**, `npm run typecheck` und `npm run build` erfolgreich. Im vollständigen Root-Render wurden ohne beschleunigte Uhr nach 39,2 Sekunden am Desktop 1.134 und nach 61,6 Sekunden im mobilen Viewport 416 veränderte Wandpixel erkannt (Schwelle: acht Farbwerte). Das sind Bildpixel, keine gezählten Fenster. Die projizierte Dachmaske blieb mobil unverändert; am Desktop lagen fünf abweichende Randpixel innerhalb der Maskentoleranz. Dachshader, Dachmaterialien und die übrigen 26 geschützten Quelldateien sind unverändert. Die Szene behielt 100 Gebäudeteile, 525.684 Geometriebytes und zwei Gebäude-Draw-Calls pro Frame im untersuchten Ausschnitt. Diese Ausschnittwerte sind keine Berlin-weite Speicher- oder FPS-Messung.

Ein separater WebGL2-Abgleich von 10.240 Shader-/CPU-Proben bestätigte identische Fensteridentitäten und Beleuchtungswerte innerhalb der RGBA8-Quantisierung. Getestet wurden außerdem eine nichtleere Kachel ohne sichtbare Gebäude (kein zusätzlicher Animationstimer), bestehende Eventflüge, Eventdetails/Merkliste sowie Quick-Reply/Chat. Die Nachweise liegen außerhalb des App-Repositories unter `/workspace/work/noct-window-lighting/`; sie werden nicht als App-Assets veröffentlicht.

Keine Aussage über echte iPhone-FPS oder GPU-Leistung allein aus Chromium/SwiftShader. Funktionale Mobilprüfung nutzt einen Touch-Viewport 390×844. Direkter Live-Kachelabruf war in dieser Arbeitsumgebung zuletzt durch CONNECT 403 blockiert; eine Zusicherung für die aktuell ausgelieferten Live-Tiles oder alle Mobilgeräte folgt aus dem Replay nicht.

Phase 3 (Autos) bleibt vollständig unverändert. Keine Änderung an Claude-Design, UI, Events, Chat, Filtern, Favoriten oder Kamerafahrten.
