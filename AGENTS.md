# NOCT – Regeln für Coding-Agenten

Bestehende Next.js-/React-/TypeScript-/MapLibre-App weiterentwickeln. Keine Neuerstellung und keine unaufgeforderten visuellen Änderungen. Vorhandene Funktionen, Daten und `.openai/hosting.json` erhalten.

## Branches

- `main`: stabiler Integrationsstand. Nach der initialen, ausdrücklich beauftragten Migration keine direkte Entwicklungsarbeit oder direkten Pushes auf `main`.
- Codex arbeitet auf `feature/noct-3d`: 3D-Gebäude, Karte, Performance, Verkehr, KI und Funktionen.
- Claude arbeitet auf `design/noct-apple`: ausschließlich UI/UX, CSS, Farben, Typografie und Layout. Siehe `CLAUDE.md`.
- Beide Arbeitsbranches beginnen am selben stabilen Migrationscommit. Nicht automatisch zwischen Branches mergen, nicht automatisch nach `main` mergen. Kein Force-Push, kein Hard-Reset, keine destruktive Bereinigung. Integration nur auf ausdrücklichen Auftrag.
- Vor dem Bearbeiten den aktiven Branch prüfen. Bei einem unpassenden Branch zuerst auf dem zugewiesenen Branch arbeiten; fremde oder uncommittete Änderungen nicht überschreiben.
- Änderungen an gemeinsam genutzten Dateien vorher abstimmen. Die UI und Geschäftslogik teilen sich insbesondere `app/page.tsx` und `components/CityMap.tsx`; Branches allein verhindern dort keine späteren Konflikte.

## Qualität und Grenzen

`npm ci`, `npm test`, `npm run typecheck`, `npm run build` sind die vorhandenen Standardbefehle. Tests müssen aussagekräftig sein; Tests und Build belegen keine echte GPU- oder iPhone-Leistung.

Keine Secrets, echten `.env`-Dateien, `node_modules`, `.next` oder `out` einchecken. Neue kostenpflichtige Dienste nur nach Zustimmung. Die Standardkarte benötigt keinen API-Key. Details: `CONFIGURATION.md`.

Die aktuelle Gebäudedokumentation unter `docs/research/` ist eine Machbarkeitsprüfung, kein fertiggestellter texturierter Prototyp. Bestehende OSM-Gebäude als Fallback erhalten. Hauptkarte erst nach erfolgreichem separatem Modellvergleich und ausdrücklicher Freigabe verändern. Keine generischen Texturen als echte Berliner Fassaden ausgeben.
