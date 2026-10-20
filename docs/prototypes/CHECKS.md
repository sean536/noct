# Gebäude-Labor – Prüfstand 20.10.2026

## Tatsächlich geprüft

- `npm test`: **17 Testdateien**, 0 fehlgeschlagen; bestehende Chat-, Tour-, Event-, Startscreen-, Verkehrs- und Renderingtests eingeschlossen.
- Neue fokussierte Verträge: Manifest2, GLB7, Modellressourcen6, Positionierung1, Importsitzung2; insgesamt18 Fälle. Relevante Fehler wurden vor der Implementierung beobachtet und nach den Korrekturen erneut geprüft.
- `npm run typecheck`: Exit-Code0.
- `npm run build`: Exit-Code0; `/` und `/prototypes/berlin-buildings` erfolgreich statisch exportiert. Bestehender Hinweis auf ältere `baseline-browser-mapping`-Metadaten; keine Aussage zur App-Ladezeit daraus abgeleitet.
- `node --import tsx scripts/inspect-building-glb.ts --help`: Exit-Code0. Echte Modelldatei war für den CLI-Importtest nicht vorhanden.
- `git diff --check`: Exit-Code0.
- Vergleich zum Ausgangscommit `9f834f3` für `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, bestehende `components`, `lib`, `next.config.ts` und `.openai/hosting.json`: keine Änderungen.
- Musterbasierte Prüfung der Quellcodedateien auf private Schlüssel und gängige Tokenformate ohne Treffer; keine vollständige Sicherheitszertifizierung.
- Unabhängige Quellen-/Codeprüfung: **teilweise bestätigt**. Gefundene Lücken bei fehlgeschlagener Bilddekodierung, tatsächlichen Textur-/Attribut-Uploadbudgets und Bounds wurden korrigiert und erneut geprüft.

## Ausdrücklich offen

- Keine originale Berliner Mesh-Kachel, daher keine visuelle Qualitäts- oder Fassadenprüfung.
- Keine bestätigten aktuellen kommerziellen Rechte/Bearbeitungs-/Hostingrechte für eine konkrete texturierte Berliner Datei.
- Keine Georeferenzprüfung anhand echter amtlicher Kontrollpunkte; die Achsen-/Mercatormathematik ist getestet.
- Kein tatsächlicher Browser-/WebGL-Render, Kameratest auf einem Gerät oder iPhone-FPS-/GPU-/Gesamtspeicher-Test. Synthetische Unit-Fälle und erfolgreicher Build ersetzen diese Nachweise nicht.
- Keine realen Vorher-Nachher-Ladezeitwerte. Die Telemetrie ist für den späteren echten Import vorbereitet.
- Kein öffentliches Vorschau-Deployment; getrennte lokale Route im Featurebranch. Die Hauptkarte wurde nicht ersetzt.
