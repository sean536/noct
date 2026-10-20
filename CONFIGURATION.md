# NOCT – Betrieb und externe Dienste

## Lokaler Start

Node.js >=20.9 ist für Next.js 16 erforderlich; Node.js 22 LTS empfohlen. Der Migrationsstand wurde mit Node.js 24.19.0 und npm 11.9.0 geprüft.

```sh
npm ci
npm run dev
```

http://localhost:3000 öffnen. Prüfungen: `npm test`, `npm run typecheck`, `npm run build`. Der Produktionsbuild erzeugt den statischen Export in `out/`. Auf einem frischen Checkout zuerst `npm ci` ausführen.

## Dienste und Variablen

| Dienst | Verwendung | Einrichtung |
| --- | --- | --- |
| Geoportal Berlin, DOP 2025 | Standard-Luftbilder über WMS | Kein API-Key. Endpoint und Attribution in `lib/imagery.ts`; Internetzugriff auf `gdi.berlin.de` nötig. Bestehende Quellenangaben erhalten. |
| OpenFreeMap / OpenMapTiles / OSM | Gebäude und geladene Straßen für den simulierten Verkehr | Kein API-Key. Endpoint `https://tiles.openfreemap.org/planet` in `lib/buildings.ts`. Quellenangaben und Anbieterbedingungen erhalten. |
| MapTiler Satellite | Optionale alternative Luftbilder | Einzige aktuell gelesene Umgebungsvariable: `NEXT_PUBLIC_MAPTILER_KEY`. Standardmäßig nicht gesetzt. Vor Nutzung Tarif, Nutzungsrechte und Limits prüfen; keine Aktivierung im Rahmen der Migration. |
| KI-Chat | Lokale regelbasierte Demo in `lib/chat.ts` | Kein externer KI-Dienst und kein KI-Schlüssel vorhanden. Eine spätere echte KI-Anbindung benötigt einen serverseitigen Dienst; geheime Schlüssel niemals als `NEXT_PUBLIC_*` veröffentlichen. |
| Events und Tickets | Sieben vorhandene Demo-Events an realen Locations; Affiliate-Felder vorbereitet | Keine Live-Event-API, kein bezahlter Ticketdienst, keine aktiven Affiliate-Credentials. Daten in `lib/events.ts` unverändert. |
| Merkliste | Browser-`localStorage` | Keine Datenbank und keine Anmeldung; keine Synchronisierung zwischen Geräten. |

Optional `.env.example` lokal nach `.env.local` kopieren und nur bei gewünschter MapTiler-Nutzung den eigenen, auf erlaubte Domains eingeschränkten öffentlichen Browser-Key setzen. `NEXT_PUBLIC_*` wird beim Build in die Browserdateien eingebettet: nach Änderungen neu bauen. Keine geheimen Werte in Git einchecken. Der Standardbetrieb braucht keine `.env`-Datei.

## Bestehendes Deployment

`.openai/hosting.json` bleibt unverändert und verweist auf das vorhandene Sites-Projekt sowie `out` als statisches Ausgabeverzeichnis. Projekt-ID ist Konfiguration, kein Zugriffstoken. Die bestehende URL bleibt:

https://noct-berlin.tuned-cove-5285.chatgpt.site

Der Upload in GitHub allein ändert weder dieses Deployment noch dessen Quellrepository-Zuordnung. GitHub ist nach der Migration das gewünschte Arbeitsrepository; eine automatische Veröffentlichung von dort ist **nicht eingerichtet**. Eine neue Hosting-/CI-Verknüpfung erfordert separate Einrichtung und Zustimmung. Zugang zu GitHub ersetzt keine Sites-Zugangsberechtigung.

Keine Build-Verzeichnisse oder Zugangsdaten werden übertragen. Lokal weiterhin `out` durch `npm run build` erzeugen; für eigenes statisches Hosting ist dessen Inhalt das Deployment-Artefakt.

## Realistische Gebäude

Aktuell weiter MapLibre-Extrusionen mit OSM-Umrissen; keine texturierten Berliner Mesh-Assets vorhanden. Die aktuelle Untersuchung liegt getrennt unter `docs/research/textured-buildings-feasibility.md`. Datensatz, Lizenzlücke, Portalwartung und Netzwerkgrenzen sind dokumentiert. Keine unfertige Modellebene wird in den stabilen Anwendungscode aufgenommen.

## Zusammenarbeit

- Codex: `feature/noct-3d`, technische Entwicklung.
- Claude: `design/noct-apple`, ausschließlich Gestaltung.
- `main`: stabiler Ausgangsstand; keine automatische Integration und kein Force-Push.

Diese Regeln sind Arbeitsanweisungen, keine serverseitig eingerichtete GitHub-Branch-Protection. Eine technische Sperre für direkte Pushes wurde nicht eingerichtet.
