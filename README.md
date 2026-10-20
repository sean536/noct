# NOCT — Berlin after dark

Mobile-first interaktiver Nightlife-Prototyp. Next.js 16, React 19, TypeScript, Tailwind 4, MapLibre GL JS.

## Starten

Node.js 20.9+ (empfohlen 22).

```sh
npm ci
npm run dev
```

http://localhost:3000 öffnen. Produktionsbuild: `npm run build` (statischer Export in `out/`). Prüfung: `npm run typecheck` und `npm test`.

Arbeitsrepository: [sean536/noct](https://github.com/sean536/noct). Claude öffnet `design/noct-apple`, Codex `feature/noct-3d`; `main` bleibt der stabile Integrationsstand. Betriebs-/Dienstekonfiguration: [CONFIGURATION.md](CONFIGURATION.md). Branch-Regeln: [AGENTS.md](AGENTS.md) und [CLAUDE.md](CLAUDE.md). Umfang der Übertragung: [MIGRATION.md](MIGRATION.md).

## Funktioniert

- Interaktive MapLibre-Luftbildkarte: pan, zoom, drehen/nach Norden ausrichten, Kreuzberg/Friedrichshain zentrieren, anklickbare Pins.
- Echte Berliner Luftbilder per WMS; ohne Verbindung Fehlerhinweis/Retry, ohne WebGL Event-Liste. Keine künstlichen Gebäude.
- Chat per Enter, Sendebutton oder Quick Reply. Genre, Bezirk und Eintrittsbudget bleiben über Nachrichten erhalten. Beispiel: „Techno“ → „bis 15 €“ → „Friedrichshain“.
- Empfehlungs-Sheet, Eventdetails, leere Ergebnisse, Merkliste in localStorage, Schließen mit Escape, Dialog-Fokusführung und reduzierte Animationen.

## Simuliert / Grenzen

Keine echte KI, keine Live-Events, keine Buchungen. Sieben fiktive Events an recherchierten realen Locations mit Beispieldatum20.10.2026; Preise/Zeiten/Artworks sind Demo-Inhalte, kein tatsächliches Programm oder Verbindung zu den Betreibern. Kartenpunkte sind OSM-POIs, keine vermessenen Dachmittelpunkte. „Heute Abend“ bezieht sich im Demo-Datensatz auf dieses Datum. Luftbilder kommen von Geoportal Berlin (DOP2025, dl-de-zero-2.0). Netzwerk und WebGL erforderlich; keine simulierten Offline-Bilder. Keine Authentifizierung, kein Backend, kein geräteübergreifendes Speichern.

`lib/chat.ts` enthält die austauschbare Chat-Logik. Für echte KI einen serverseitigen API-Endpunkt hinzufügen; API-Schlüssel niemals im Frontend speichern. Der statische Export muss für Serverbetrieb angepasst werden.

`lib/events.ts` enthält das Eventmodell inklusive `ticket.url`, `ticket.affiliateUrl`, `ticket.provider`, `ticket.campaignId`. Der Detaildialog zeigt einen Anbieterlink nur bei vorhandener URL. Aktuell keine Ticketlinks, keine Provisionserfassung, keine erfundenen Käufe. Später validierte Feed-Daten, Server-Tracking und Affiliate-Kennzeichnung ergänzen.

## Luftbilder und Design

Helle iOS-Oberflächen, Apple-Systemschrift auf unterstützten Geräten, monochrome Pins, reduzierte Bewegung. Standardmäßig kein API-Key. Vergleich/optionale MapTiler-Einrichtung: `IMAGERY.md`, `.env.example`. Keine zusätzlichen Pakete oder Architekturänderungen.

## Minimale Startseite und Event-Tour

Nur Begrüßung, Berlin-Menü, Eingabe und sieben Chips beim Start (plus Quellenangaben). Merkliste, Entdecken und Zoom bleiben im Berlin-Menü. Die dreidimensionale Tour fliegt über höheres Staging, readinessgesteuerten Abstieg und bewegten Vorbeiflug ohne reguläre Zwei-Sekunden-Stopps endlos weiter. Bei fehlender Bereitschaft folgt ein begrenzter höherer Vorbeiflug. Nach manueller Interaktion automatische Rückkehr nach sechs ruhigen Sekunden, solange keine Eingabe oder Panels aktiv sind. Keine Play-/Pause-/2D-Schalter. Opaque OSM-Gebäude und instanzierter simulierter Verkehr auf geladenen Straßen; keine Live-Verkehrsdaten und kein neuer API-Key. Aktuelle Architektur, Quellen, Grenzen und Prüfungen: `LIVING-CITY.md` bzw. `/living-city-report.md`.

## Verifizierung

Siehe CHECKS.md für tatsächlich ausgeführte Prüfungen und verbleibende Grenzen.

Aktueller Lade-/Hero-Bericht: `PRELOADING.md` (im Browser `/preloading-report.md`). Die dort beschriebene Ankunftssteuerung ersetzt den früheren starren Zwei-Sekunden-Takt.

CPU-Benchmark (synthetisch, keine GPU-/Browsermessung): `node --import tsx scripts/benchmark-traffic.ts`.
