# NOCT – Regeln für Coding-Agenten

Bestehende Next.js-/React-/TypeScript-/MapLibre-App weiterentwickeln. Keine Neuerstellung und keine unaufgeforderten visuellen Änderungen. Vorhandene Funktionen, Daten und `.openai/hosting.json` erhalten.

## Branches

- `main`: stabiler Integrationsstand. Nach der initialen, ausdrücklich beauftragten Migration keine direkte Entwicklungsarbeit oder direkten Pushes auf `main`.
- Codex arbeitet auf `feature/noct-3d`: 3D-Gebäude, Karte, Performance, Verkehr, KI und Funktionen.
- Claude arbeitet auf `design/noct-apple`: ausschließlich UI/UX, CSS, Farben, Typografie und Layout. Siehe `CLAUDE.md`.
- Beide Arbeitsbranches beginnen am selben stabilen Migrationscommit. Nicht automatisch zwischen Branches mergen, nicht automatisch nach `main` mergen. Kein Force-Push, kein Hard-Reset, keine destruktive Bereinigung. Integration nur auf ausdrücklichen Auftrag.
- Vor dem Bearbeiten den aktiven Branch prüfen. Bei einem unpassenden Branch zuerst auf dem zugewiesenen Branch arbeiten; fremde oder uncommittete Änderungen nicht überschreiben.
- Änderungen an gemeinsam genutzten Dateien vorher abstimmen. Die UI und Geschäftslogik teilen sich insbesondere `app/page.tsx` und `components/CityMap.tsx`; Branches allein verhindern dort keine späteren Konflikte.

## Verbindliche GitHub-Checkpoints

- Vor umfangreichen Änderungen den funktionierenden Ausgangsstand mit einem Git-Checkpoint sichern. Den aktiven Entwicklungsbranch und vorhandene Änderungen zuerst prüfen; fremde Arbeit nicht überschreiben.
- Nach jedem größeren abgeschlossenen und überprüften Arbeitsschritt automatisch einen aussagekräftig benannten Commit erstellen und auf den zugewiesenen Entwicklungsbranch pushen. Beispiele: UI-Komponenten integriert, Chat/Eventdetails verbunden, mobile Fehler behoben, Prüfungen erfolgreich, finale Integration abgeschlossen.
- Den ersten Push nicht bis zum Ende eines langen Auftrags aufschieben. Bei Wiederaufnahme zuerst den erhaltenen Workspace, Diff, ungetrackte Dateien und vorhandene Checkpoints prüfen; keine bereits erledigte Entwicklung wiederholen.
- Bei absehbarer Unterbrechung den nachvollziehbaren Stand möglichst frühzeitig sichern. Unfertige Zwischenstände dürfen sicher und ausdrücklich als `WIP` gekennzeichnet auf den Entwicklungsbranch gepusht werden. Offene Fehler und tatsächlich ausgeführte Prüfungen dokumentieren; einen WIP-Checkpoint nicht als fertige Freigabe ausgeben.
- Push-Erfolg und Remote-Commit prüfen. Bei fehlendem Zugriff oder Konflikten die lokale Sicherung erhalten und den konkreten Blocker melden. Keine Force-Pushes, unkontrollierten Pushes auf `main` oder automatischen Merges.
- Keine Secrets, echten `.env`-Dateien oder Build-Artefakte einchecken. Keine zusätzlichen Entwicklungswebsites erstellen; ausschließlich die ausdrücklich beauftragte bestehende Entwicklungswebsite aktualisieren.

## Persönliche Clubfoto-Demo

Das GitHub-Repository ist öffentlich. Die vier bereitgestellten Clubfotos und sämtliche Derivate bleiben außerhalb des Repositories; nicht auf GitHub einchecken oder auf öffentlichen Websites bereitstellen. Nur der Code und die Bildzuordnung dürfen gepusht werden. Für die Fotovariante muss die bestehende Entwicklungswebsite nachweislich owner-private bleiben, einschließlich statischer Bilddateien. Den Zugriff vor jedem Foto-Upload erneut prüfen; nie diese Version öffentlich schalten. Standardbuilds aktivieren die Fotos nicht. Siehe `docs/ui/private-location-photos.md`.

## Prüfung und Projektgrenzen

`npm ci`, `npm test`, `npm run typecheck`, `npm run build` sind die vorhandenen Standardbefehle. Tests müssen aussagekräftig sein; Tests und Build belegen keine echte GPU- oder iPhone-Leistung.

Keine Secrets, echten `.env`-Dateien, `node_modules`, `.next` oder `out` einchecken. Neue kostenpflichtige Dienste nur nach Zustimmung. Die Standardkarte benötigt keinen API-Key. Details: `CONFIGURATION.md`.

Die aktuelle Gebäudedokumentation unter `docs/research/` ist eine Machbarkeitsprüfung, kein fertiggestellter texturierter Prototyp. Bestehende OSM-Gebäude als Fallback erhalten. Hauptkarte erst nach erfolgreichem separatem Modellvergleich und ausdrücklicher Freigabe verändern. Keine generischen Texturen als echte Berliner Fassaden ausgeben.
