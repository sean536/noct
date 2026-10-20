# NOCT – Migration nach sean536/noct

## Herkunft und Umfang

Der vollständige vorhandene NOCT-Quellcode wurde unter `/workspace/sites/noct` identifiziert. Stabiler Ausgangscommit im bisherigen Sites-Quellrepository: `d961cfbe4b276540d161886b3fb2d8e3563ce8bc`.

Übernommen wird dessen aktueller Quellcode-Snapshot mit Komponenten, Karte, Gebäuden, Kameratour, Verkehr, Chat, Events, Tests, Skripten, öffentlichen Dateien, Lockfile und Deployment-Konfiguration. Die bestehende Git-Historie verbleibt zusätzlich im bisherigen Repository; die GitHub-Migration übernimmt den aktuellen Stand, nicht die früheren Commitobjekte.

Die Migration verändert keinen Anwendungscode und kein Design. Ergänzt werden `.gitignore`, Betriebs-/Zusammenarbeitsdokumentation und Agentenhinweise. Die neueste Machbarkeitsprüfung zu texturierten Berliner Gebäuden wird in `docs/research/` erhalten; sie ist kein fertiger Prototyp und enthält keine produktive Änderung der Hauptkarte.

## Branch-Ausgangspunkt

Zielrepository: https://github.com/sean536/noct

`main`, `feature/noct-3d` und `design/noct-apple` sollen bei Abschluss auf denselben vollständigen stabilen Importcommit zeigen. Die endgültigen Remote-SHAs werden nach dem Upload unabhängig geprüft und im Abschlussbericht genannt. Keine automatischen Merges. Zuständigkeiten stehen in `AGENTS.md` und `CLAUDE.md`.

## Ausgeschlossene lokale Daten

Keine Credentials, privaten Schlüssel, echten `.env`-Dateien, `node_modules`, `.next`, `out`, Logs, Compiler-Caches oder Arbeitsumgebungs-Scratchdateien. `.env.example` enthält ausschließlich kommentierte Platzhalter. `.openai/hosting.json` bleibt für das vorhandene Deployment erhalten.

Der Betrieb setzt die in `CONFIGURATION.md` dokumentierten öffentlichen Kartendienste voraus. Kein obligatorischer API-Key, kein Backend und keine Datenbank fehlen für den aktuellen lokalen Demo-Funktionsumfang.

## Prüfung des Imports am 20.10.2026

- `npm test`: 12 vorhandene Testdateien bestanden, 0 fehlgeschlagen.
- `npm run typecheck`: Exit-Code 0.
- `npm run build`: Exit-Code 0, statischer Export erfolgreich. Bestehender Hinweis auf veraltete `baseline-browser-mapping`-Metadaten; keine Dependency-Änderung für diese Migration.
- Quellcodevergleich mit dem stabilen Ausgangscommit: `app`, `components`, `lib`, `tests`, `scripts`, Lockfile, Build-Konfiguration und Hosting-Konfiguration unverändert.
- Dateiauswahl auf versehentlich enthaltene Build-Verzeichnisse und Secrets geprüft; zusätzliche musterbasierte Suche nach privaten Schlüsseln und gängigen Tokenformaten ohne Treffer. Das ist kein Anspruch auf eine umfassende Sicherheitszertifizierung.
- Die Migration ist keine neue visuelle, Karten-, Browser- oder iPhone-Funktionsänderung. Solche Prüfungen werden durch Build und Unit-Tests nicht behauptet.
