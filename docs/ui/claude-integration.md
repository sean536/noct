# Phase 3 — Integration des freigegebenen Claude-Designs

## Grundlage und Sicherung

Einzige visuelle Vorlage: [`NOCT – UI-Prototyp.html`](../../NOCT%20%E2%80%93%20UI-Prototyp.html), Upload-Commit `b38f30a`. Der freigegebene Phase-2-Stand `4e0e1d8` ist als annotierter Git-Tag `checkpoint/noct-phase2-before-ui` auf GitHub gesichert; zusätzlich besteht ein lokales Bundle außerhalb des Projekts.

Das HTML wird weder als iframe eingebettet noch als App ausgeführt. Sein `#map-slot`, seine Demo-Pins, sein `EV`-Array und seine JavaScript-Zustandsmaschine werden nicht übernommen.

## React-Integration

- `app/page.tsx` bleibt Eigentümer von Navigation, Chatverlauf, gemeinsamen Präferenzen, Merkliste und Kartenaufträgen.
- `Composer`, `NoctSheet`, `EventCard` und `EventDetails` bilden die wiederverwendbaren Oberflächen. `Poster` zeigt die neutralen illustrativen Flächen der Vorlage; es sind keine echten Eventfotos.
- `lib/chat.ts` bleibt die bestehende lokale Empfehlungsfunktion. `lib/event-filters.ts` stellt ihren bisherigen Auswahltest auch den neuen Filter-Schaltflächen, Eventkarten und Karten-IDs zur Verfügung. Keine parallele Chat- oder Eventdatenbank.
- „Afro“ verwendet den vorhandenen Wert `Afrobeat`. „House“ sucht die bereits vorhandenen House-Tags der Events `soft-sunset` und `techno2`. Hip-Hop und Dates bleiben im Filter und im Chat verfügbar. Genre, Bezirk und Budget gelten gemeinsam für Chat, Empfehlungen, Merkliste und Marker.
- Die Merkliste verwendet weiterhin `noct-saved` und die ursprünglichen String-IDs. Nicht passende Marker und ihr gegebenenfalls aktives Label werden bei einer gefilterten Auswahl ausgeblendet; die Karte und ihre Gebäude bleiben sichtbar.
- Hamburg und London sind deaktiviert und als „Demnächst“ beschriftet. Berlin bleibt die einzige unterstützte Stadt.

Die Karte bleibt die bestehende MapLibre-Instanz mit bisherigen Quellen, Fassaden, Dachmaterialien, dynamischer Fensterbeleuchtung, Kameraflügen, Tour, Streaming und Fallbacks. Keine Änderungen an `components/CityMap.tsx`, den Karten-/Rendering-Modulen, Eventdaten oder Worker-Geometrien. Die Karte liegt unter einer durchlässigen React-Overlay-Ebene; nur sichtbare Bedienelemente und echte modale Dialoge belegen Zeigerflächen.

## Design und mobile Bedienung

Tokens, Systemtypografie, kompakter Header, Hero/Composer, fünf Chips, schwebende Navigation, helle Sheets, Karten und Details stammen aus der Vorlage. Funktionale kleine Grautexte und inaktive Navigationssymbole verwenden das ebenfalls in der Vorlage enthaltene `#636366`, um den Kontrast gegenüber `#8E8E93` zu verbessern. Keine externen Apple-Schriften, neuen Pakete oder kostenpflichtigen APIs.

Safe Areas und `visualViewport` steuern die UI-Höhe und deren oberen Versatz. Die Karte behält ihren vollständigen Bildschirmbereich. Bei Tastatureinblendung bleibt das fokussierte Start-Eingabefeld erreichbar; Chat-Sheets nutzen den sichtbaren Bereich und behalten den Composer am unteren Rand. Header und Bottom-Navigation werden während der mobilen Texteingabe vorübergehend ausgeblendet. Sheets scrollen intern. Modale Sheets haben Fokusbegrenzung, Escape und Fokusrückgabe mit einem erreichbaren Rückfallziel; darunterliegende Oberflächen sind `inert`.

Eintrittsanimationen respektieren Reduced Motion. Das Schließen entfernt ein Sheet derzeit direkt; die vollständige verzögerte Austrittsanimation des HTML-Prototyps wird nicht nachgebildet. Am Desktop rückt die Filter-Schaltfläche bei geöffnetem Seitenpanel links daneben, damit sie nicht wie in der unveränderten Vorlage überdeckt wird. Bei modalen Dialogen wird die inaktive Hintergrundnavigation auch visuell verborgen, damit sie auf kleinen Bildschirmen keine Detailaktionen verdeckt.

## Tatsächliche Produktgrenzen

Chat: lokale Regeln, keine angebundene KI-API. Events, Konditionen und Artworks bleiben ausdrücklich Demo. Die echten Orte, IDs, Adressen und Quellen bleiben erhalten. Derzeit gibt es keine Ticketlinks; die Detailansicht kennzeichnet deshalb den fehlenden Ticketverkauf. Später vorhandene Ticket-/Affiliate-URLs werden über die bestehende Datenstruktur geöffnet.

Browsernachweise in dieser Arbeitsumgebung verwenden die vollständige Root-App, echte georeferenzierte Berliner Testgrundrisse/-höhen als MVT-Replay und ein neutrales QA-Raster. Externe Live-Kacheln sind hier nicht zuverlässig erreichbar; das Replay belegt keine aktuelle Providerverfügbarkeit. Im Nutzerbrowser lädt die App unverändert die bisherigen Live-Quellen.

Chromium mit Mobil-/Touch-Viewports und kontrolliertem Visual-Viewport-Signal ist kein physischer iPhone-Safari-Test. Native Bildschirmtastatur, reale Safari-GPU-Leistung und geräteweite Hintergrundwechsel bleiben separat auf echten Geräten zu prüfen. Keine zugesicherten iPhone-FPS oder universelle Barrierefreiheit aus diesen Prüfungen.

## Ausgeführte Prüfungen

- `npm test`: 93 bestanden, keine Fehler. Der bestehende Startscreen-Test wurde auf die ausdrücklich freigegebene neue Oberfläche aktualisiert; ein zusätzlicher Test prüft House anhand bestehender Events samt Budget.
- `npm run typecheck` und `npm run build`: erfolgreich, einschließlich der bestehenden Prototyp-Routen.
- Vollständige Root-App in Chromium bei 1365×900, 390×844 mit Touch, 320×568 und 768×1024: 25 bestandene Verhaltensgruppen, keine JavaScript-Seitenfehler. Chat/Empfehlungen, Eventdetails, Marker, persistentes Merken/Entfernen, gemeinsame Genre-/Preisfilter, Fokus/Escape, Maus/Touch, simulierte Tastaturansicht, Reduced Motion und Überlauf geprüft.
- Drei gezielte Regressionen für Start-Eingabe bei Tastatur, vollständigen Detailtitel und Entfernen eines eigenen Chat-Budgets sowie eine separate Prüfung der unüberdeckten mobilen Detailaktionen bestanden. Fehler wurden vor den Korrekturen reproduziert und dieselben Prüfungen anschließend erneut ausgeführt.
- 25 geschützte Karten-/Rendering-/Daten-/Vorlagendateien stimmen mit dem Ausgangsstand überein. Der Gebäudeworker bleibt `76104ab85a3b`. Im untersuchten Berliner Root-Ausschnitt wurden weiterhin 100 Gebäudeteile, 525.684 Geometriebytes und zwei Gebäude-Draw-Calls gerendert; die Phase-2-Lichtuhr läuft während Kamerabewegungen und friert bei Reduced Motion ein. Dies sind keine geräteweiten Leistungsbenchmarks.
- Gemessener Kontrast des unmarkierten Herzsymbols auf der weißen Karte: 3,26:1. Inaktive Navigationssymbole auf dem transparenten Glas: mindestens 3,17:1 über den geprüften schwarzen/weißen Untergrenzen. Eingaben nutzen den abgerundeten äußeren Fokusring statt einer zusätzlichen rechteckigen Innenkontur.

Screenshots, ausführbare Browserprüfungen und Rohprotokolle liegen außerhalb des Repositories unter `/workspace/work/noct-ui-integration/`. Sie dokumentieren den oben begrenzten Prüfumfang und sind kein Ersatz für die interaktive Entwicklungswebsite.
