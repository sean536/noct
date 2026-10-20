# NOCT – Design-Arbeitsbereich

Öffne **`design/noct-apple`** und lies auch `AGENTS.md`.

Dein Auftrag ist ausschließlich UI/UX: CSS, Farben, Typografie, Layout und Apple-inspirierte Oberflächen. Die bestehende App und ihre Funktionen bleiben erhalten. Keine neue App erstellen.

- Nicht direkt auf `main` arbeiten oder pushen.
- Keine Änderungen an Kamerasteuerung, Kartendaten, Gebäude-/Verkehrsrendering, KI-/Chatlogik, Eventdaten, Empfehlungen, Merkliste oder Datenanbindungen.
- In gemischten Komponenten nur Darstellung verändern und Handler, Zustände, Datenflüsse, Accessibility und bestehende Interaktionen erhalten. Bei Überschneidungen mit Codex zuerst abstimmen.
- Keine automatischen Merges zwischen Branches oder nach `main`, keine Force-Pushes, keine destruktiven Git-Befehle.
- Safe Areas, Touch, Responsivität, Fokusführung und `prefers-reduced-motion` berücksichtigen. Keine neuen kostenpflichtigen Dienste oder unnötigen Dependencies.
- Nach Änderungen `npm test`, `npm run typecheck`, `npm run build` ausführen und tatsächliche visuelle Prüfungen getrennt von Build-Erfolg berichten.

Start: `npm ci`, dann `npm run dev`; Browser: http://localhost:3000. Weitere Konfiguration: `CONFIGURATION.md`.
