# Prüfprotokoll Living City — 20.10.2026

## Nachgewiesen

- 48 automatisierte Tests: `node --import tsx --test --test-reporter=spec tests/*.test.ts`, 0 Fehler.
- TypeScript und Next-Produktionsbuild/statischer Export: Exit0. Bestehende Warnung zu älteren baseline-browser-mapping-Daten ist kein Build-Fehler.
- Red/Green: kontinuierlicher Handoff-Test scheiterte am bisherigen Controller mit zweisekündigem Stillstand, besteht nach der Umstellung.
- Integrierte echte Tour-/SceneFlight-Controller mit kontrollierten Kamera-/Source-/Render-Signalen:12 Vorbeiflüge, Wiederholung nach letztem Event, kalte/nicht verfügbare Zielregion, höhere Fallback-Ansicht, kein regelmäßiger Stillstand, keine Überlappung, keine verbliebenen Timer.
- Zielvorbereitung und finale Darstellung werden separat bestätigt; höheres Staging und3D-Pitch, begrenzter höherer Bogen, Reduced Motion, manuelle Zielersetzung, UI-/Hidden-Pausen und Dispose getestet.
- Verkehr: gültige Straßenklassen, Bodenniveau, Einbahnrichtung, Tunnel-/Brücken-/Rampen-/Privatweg-Ausschluss, Gebäude-/Abstandsprüfung, Endpunkt-Fading, Positionskontinuität und Lastreduktion bisnull getestet.
- Custom-Layer-Adapter gegen Fake-GL geprüft: gemeinsame72-Vertex-Geometrie, ein Instancing-Aufruf, zwei Buffer, Ressourcen-/Listener-Freigabe. Kein echter GPU- oder Shader-Rendernachweis daraus abgeleitet.
- Zusammengeführter Style mit deckenden Gebäuden und gerichteter Beleuchtung gegen installierten Style-Validator gültig; Providerhöhen und echte Event-POIs erhalten.
- Bestehende Chat-/Budget-/Demo-/Affiliate-/Startscreen-Tests bestehen. Hero-Wortlaut, ein Input, sieben Chips und keine neuen Startpanels.
- Quellvergleich: CSS, Events/Chat, Luftbildquelle, Renderbudgets, Modal/Poster und Dependencies bytegleich. App-Seite ausschließlich um die ausdrücklich bestätigten drei Menüschalter und die veraltete Tour-Hilfe angepasst.
- Reproduzierbarer synthetischer Node-CPU-Benchmark in `scripts/benchmark-traffic.ts`, Rohdaten `/traffic-cpu-benchmark.json`. Keine realen Fahrzeugsensoren und keine synthetischen Straßen im App-Kartenbild.

## Nicht nachgewiesen

Kein Browser-/Screenshot-/Touch-Werkzeug verfügbar; externe Kartendomains im Entwicklungsnetz gesperrt. Deshalb keine tatsächlichen Berliner Vorher-/Nachher-Tile-Ladezeiten, keine beobachteten Autos oder Gebäude im Browser, keine FPS-/GPU-/Gesamtspeicher-/iPhone-Messungen. Der CPU-Mikrobenchmark und der Fake-GL-Test ersetzen diese Nachweise nicht.

Manuelle Browserprüfung der automatischen Rückkehr nach sechs ruhigen Sekunden, echter Karten-/Detail-/Merklisten-Klicks, visueller Kameraübergänge und Fahrzeugdarstellung bleibt offen. Die Daten-/Funktionspfade sind erhalten und die Controller-/Geometrie-Regressionen sind getestet.

## Grenzen und Bericht

MapLibre und die vorhandenen OSM-Daten erzeugen stilisierte Extrusionen, keine Fotofassaden/Dachmodelle. HTTP-Vorladen garantiert keine fertige unsichtbare GPU-Szene. Fehlende Daten führen zum begrenzten höheren Vorbeiflug; spätes Nachladen bleibt möglich. Verkehr wird bei fehlenden/ungültigen Daten oder zu hoher Last reduziert/ausgeblendet. Das Entwicklungsnetz ist kein Nachweis eines App-/Anbieterfehlers.

Aktuelle Architektur, Messwerte, Quellen, Dateien und Vergleich Google Maps3D / Mapbox / Cesium: `LIVING-CITY.md`, im Browser `/living-city-report.md`. Ältere Performance-/Ankunftsberichte sind historisch markiert.
