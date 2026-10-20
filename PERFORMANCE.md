> Aktueller Stand: [Living-City-Bericht](/living-city-report.md). Dieser Performance-Bericht bleibt als historischer Nachweis erhalten.

> Historischer Bericht des vorherigen Upgrades. Der starre Zielwechsel-Takt, das Ein-Kachel-Vorladen und die unmittelbare moveend-Ankunft wurden inzwischen durch die in [PRELOADING.md](/preloading-report.md) beschriebene Steuerung ersetzt. Die damaligen Messwerte sind kein aktueller Gebäude-Ladezeitnachweis.

# Premium-Redesign und Performance-Upgrade

Stand: 20. Oktober 2026. Ausschließlich das bestehende Nightlife-Projekt `/workspace/sites/noct`; keine Arbeit an PACO, keine neue App, keine neue Dependency.

## Ergebnis und Nachweisgrenzen

Der automatische Eventwechsel verwendet nach dem einmaligen Anflug einen Solltakt von **2.000 ms zwischen Zielauswahlen**. Er wartet nicht mehr auf das Ende einer Kameraanimation. Eine verspätete Browser-Timer-Ausführung wird auf den nächsten Takt ausgerichtet; verpasste Schritte werden nicht als Warteschlange nachgeholt. Browser-Scheduling kann unter Last keine Echtzeitgarantie geben.

Die folgenden Zeitwerte stammen aus einer deterministischen Simulation der echten alten und neuen Controller mit einer künstlichen Uhr. Sie sind **keine Browser-, Netzwerk- oder GPU-Messung**:

| Größe | Vorher | Jetzt |
| --- | ---: | ---: |
| Regelmäßiger Abstand zwischen automatischen Zielauswahlen | 9.000 ms | 2.000 ms |
| Kameradauer zwischen den vier bestehenden Tour-Locations | 4.000 ms | 908 / 931 / 1.250 / 1.016 ms |
| Zulässige Dauer sonstiger Zielwechsel | 4.000 ms | 650–1.250 ms nach Entfernung |
| Einmaliger Anflug | 6.500 ms | 2.200 ms |
| Verbleibende Controller-Timer nach Dispose im Vergleich | 0 | 0 |
| Alle erzeugten JS-Chunks, unkomprimiert | 1.618.414 Bytes | 1.623.407 Bytes |

Die gezählten JS-Chunks enthalten auch gemeinsame Framework-/MapLibre-Chunks und entsprechen nicht den tatsächlich beim Erstaufruf übertragenen Bytes. Differenz: +4.993 Bytes, rund +0,31 %. Keine zusätzlichen Pakete. Die Anwendungslaufzeit wurde nicht als schneller gemessen; bestätigt sind der kürzere Takt, die kürzeren konfigurierten Bewegungen und begrenzte zusätzliche Arbeit.

## Gefundene Probleme

1. Der bisherige Timer startete nach Ankunft und wartete weitere 5 Sekunden. Zusammen mit 4 Sekunden Flug ergaben sich etwa 9 Sekunden pro Ziel.
2. Marker öffneten Details, ohne die Kamera zum gewählten Event zu führen. Manuelle Auswahl und Suchfokus hatten keine gemeinsame unmittelbare Zielsteuerung.
3. Das Eventlabel wurde bei jedem Wechsel samt DOM und Marker entfernt und neu erstellt.
4. Native Device Pixel Ratio war unbegrenzt. Bei DPR 3 entstehen neun Renderpixel pro CSS-Pixel; das kann auf Smartphones teuer sein. Antialiasing war im MapLibre-Standard ausgeschaltet.
5. Die Gebäudeerkennung durchsuchte bei jedem Idle-Ereignis den ganzen Viewport, auch nachdem Gebäude bereits bestätigt waren. Bildkachel-Ereignisse lösten wiederholte Diagnoseberechnung aus.
6. Es gab kein gezieltes Vorladen des nächsten Tour-Ziels. Der einheitliche Cache von 60 Tiles pro Quelle berücksichtigte Gerätebudgets nicht.

Der Eindruck unscharfer Gebäude konnte hier nicht visuell reproduziert werden. Tatsächlich verwendet die App MapLibre-WebGL-Vektorextrusionen auf OpenStreetMap-Grundrissen, keine texturierten 3D-Meshes. Geometrien und approximierte Gebäudehöhen werden durch den Anbieter begrenzt. Luftbildschärfe hängt zusätzlich von Rasterdaten, Zoom und Quelle ab; ein höherer DPR erfindet keine Bilddetails.

## Durchgeführte Optimierungen

### Steuerung und Reaktion

- Monotone Uhr (`performance.now`) und feste 2.000-ms-Deadlines, getrennt von `moveend`.
- Genau ein Rotationstimer und eine aktive Kamerafahrt; neue Ziele stoppen die alte Fahrt, alte Ankunfts-Callbacks werden ungültig.
- Kurze entfernungsabhängige `easeTo`-Bewegungen mit weicher kubischer Beschleunigung/Abbremsung. Nur der einmalige Intro-Anflug verwendet `flyTo`; keine regelmäßigen Zoom-Ausflüge bei gleichbleibendem Zielzoom.
- Manuelle Auswahl reagiert sofort, öffnet Details und fokussiert das Ziel. Eine ausdrücklich ausgewählte Fahrt darf hinter ihrem Detaildialog fertig werden. Die Automatik bleibt dabei pausiert.
- Texteingabe, Karteninteraktion, Eventpanels, Dialoge, Hintergrundbetrieb und reduzierte Bewegung verhindern automatische Rotation. Keine Catch-up-Flut nach Rückkehr.

### Rendering und Laden

- Gerätebudget aus DPR, Canvas-Fläche, CPU-/Speicherhinweisen und `saveData`: Economy bis DPR 1,5, Balanced bis 2, Quality bis 2,5, zusätzlich flächenbegrenzt. Kein zuverlässiger GPU-Benchmark aus diesen Hinweisen abgeleitet.
- MSAA-Antialiasing für Balanced/Quality; für Economy deaktiviert. `preserveDrawingBuffer` bleibt aus. Aktuelles DPR-3-Beispiel bei 390×844 CSS-Pixeln: Balanced DPR 2 bedeutet rechnerisch **55,6 % weniger Renderpixel**; das ist keine gemessene FPS-Steigerung. MSAA hat eigenen Aufwand.
- Adaptive Auflösung anhand von 24 Render-Abständen während Kamerabewegung, mit acht Sekunden Abstand zwischen Anpassungen. Das sind Render-Event-Abstände, keine separaten GPU-Zeiten. Keine Auflösungsänderung in jedem Frame.
- Cache 48/96/160 Tiles pro Quelle nach Gerätebudget; dieselbe Map-Instanz und ihre Caches bleiben bei Eventwechseln bestehen.
- Unterstützte Source-LOD-Parameter begrenzen entfernte Tiles bei geneigter Kamera. Höher budgetierte Geräte dürfen mehr Detail halten.
- Auf geeigneten Geräten bereits laufende gröbere Tiles beim Zoom weiterladen; auf Economy weiter aggressives Abbrechen. Kurzer Raster-Fade von 180 ms und explizit lineares Resampling. Mipmaps und anisotropes Filtering sind bereits Engine-Funktionen; sie wurden nicht als neu erfundene App-Funktion ersetzt.
- Nur bei vollständig geladenem aktuellem Viewport und aktiver Tour: niedrige Fetch-Priorität für je eine zentrale Raster- und Vektorkachel des nächsten Stopps. Höchstens zwei parallele Requests, URL-Deduplizierung, begrenzte Merkliste und Abort bei Dispose. Kein Vorladen auf Economy/Save-Data, kein zusätzlicher MapTiler-Prefetch. Unbekannte Tile-Templates werden übersprungen.
- Der Prefetch wärmt nur den normalen Browser-HTTP-Cache unter den Server-Cache-Headern. Er garantiert keine bereits geparste/GPU-geladene Geometrie. Kein Offline-Archiv, keine Bulk-Downloads, keine Umgehung von Provider-TTLs.
- Eventlabel wird wiederverwendet. Gebäudeprüfung nur bis zum ersten Nachweis, dann keine weiteren Geometrieabfragen; davor nur zentraler Teil des Viewports. Diagnosen nur bei Änderungen an React weitergeben.

### Design

Warm Off-White, Midnight Navy, zurückhaltendes Indigo, leicht lavendelfarbene und peachfarbene Posterflächen. Größerer zweizeiliger Hero mit einem hervorgehobenen Wort, Systemschrift auf Apple-Geräten, sparsame transparente Oberflächen. Keine neuen Start-Panels. Kartenbild bleibt zentral; laufende Eventlabels benötigen keinen Backdrop-Blur mehr. Kleine Touch-/Hover-Rückmeldungen, keine dauerhaft dekorativ animierten Effekte.

## Laufzeitdiagnose

Das Berlin-Menü zeigt nach erfolgreichem Datenzugriff Zeit bis zur ersten bestätigten Bildkachel sowie ersten erkannten 3D-Geometrie im zentralen Viewport, jeweils ab Map-Initialisierung. Zusätzlich Geräteprofil, aktuelles DPR und gegebenenfalls Render-Abstands-p75 bei Auflösungsanpassung. Das ist kein Navigation-TTI und keine GPU-Auslastung. Die Diagnose bleibt lokal im Browser; keine Analyse-Daten werden versendet.

## Veränderte Dateien

- `lib/tour.ts`: fester Takt, getrennte Timer-/Flugsteuerung, sofortige manuelle Auswahl.
- `components/CityMap.tsx`: Kamera, Geräteprofil, Rendering/LOD, Prefetch, Label-Reuse, lokale Diagnose.
- `lib/rendering.ts` (neu): Gerätebudgets, adaptiver Render-Sampler, Entfernung/Easing/Kamerazeiten.
- `lib/tile-prefetch.ts` (neu): begrenzter HTTP-Cache-Prefetch für das nächste Ziel.
- `lib/imagery.ts`: explizites lineares Resampling, kürzerer Raster-Fade; Anbieter, URLs, Auflösung und Attribution erhalten.
- `app/page.tsx`: Hero-Zeilen und hervorgehobenes Wort, gemeinsame manuelle Eventauswahl.
- `app/globals.css`: Premium-Farben, Typografie, Oberflächen, Eventakzente, mobile Microinteractions.
- Tests: `tests/cadence.test.ts` (neu), `tests/rendering.test.ts` (neu), `tests/tour-fixture.ts` (neu), `tests/tour.test.ts`, `tests/startscreen.test.ts`.
- Dokumentation: `PERFORMANCE.md`, `public/performance-report.md`, `CHECKS.md`, `README.md`, `TOUR-3D.md`.

`lib/events.ts` ist bytegleich geblieben (SHA-256 `709695b8ee69fe311f3bccc5eaa83b417ea2e89b113083ce74f0bd899aba55b9`). Die vorhandenen Daten sind weiterhin die zuvor gekennzeichneten Demo-Events an realen Orten; es wurden keine echten Daten durch neue Dummys ersetzt. Chat, Suche, Chips, Eventdetails, Speicher-Schlüssel und Anbieterzugänge bleiben erhalten.

## Tests und Grenzen

- TypeScript ohne Fehler; Produktionsbuild erfolgreich.
- 29 automatisierte Tests bestanden: exakter Solltakt trotz langer Fahrt, Pausegründe, neueste Zielwahl, Dialog-/Kartenauswahl, Dispose, verzögerte Timer ohne Catch-up, Renderbudgets, adaptive Grenzen, Tile-BBOX gegen den tatsächlich von MapLibre benutzten Helfer, deduplizierter/abbrechbarer Prefetch, Scene-Validator, Start-Server-Render und vorhandene Chat-/Daten-Regressionen.
- Der neue Takt-Test schlug mit der alten Implementierung erwartungsgemäß fehl und besteht nach der Korrektur.
- Keine verfügbaren Browser-/Screenshot-Werkzeuge; externe Kartenhosts sind im Entwicklungsnetz gesperrt. Daher keine echten iPhone-/Android-/Desktop-Screenshots, keine FPS-/GPU-/Draw-Call-/Speicher-/Netzwerk-Wasserfall-Messungen und kein beobachteter Nachweis schärferer Gebäude oder schnellerer externer Bildlieferung. Fehler des Entwicklungsnetzes sind keine nachgewiesenen Anbieterfehler.
- Karten- und Gebäudequalität bleiben von Netz, Anbieter und OSM-Abdeckung abhängig. Höhere Auflösung verbessert kein fehlendes Gebäudemodell. Der Luftbild-/Fehler-Fallback bleibt erhalten.

## Verwendete API-Nachweise

MapLibre 5.20 wurde über die installierten Typen und Implementierungen geprüft (`MapOptions`, `setPixelRatio`, `setSourceTileLodParams`, Raster-Filtering und Kamera-API). Die aktuelle Online-Dokumentation ist neuer; nicht vorhandene APIs wie `preloadOnly` wurden nicht angenommen. Worker-`prewarm` ist für diese dauerhaft bestehende einzelne Map kein Ersatz für ein Tile-Prefetch und wurde nicht unnötig aktiviert.

- [MapLibre MapOptions](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/)
- [MapLibre prewarm: tatsächlicher Zweck](https://maplibre.org/maplibre-gl-js/docs/API/functions/prewarm/)
- [OpenFreeMap, Nutzung und Attribution](https://openfreemap.org/)
