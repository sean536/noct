# Phase 4: persönliche Clubfoto-Demo

Das GitHub-Repository ist öffentlich. Die vier persönlichen Bilder und sämtliche Derivate werden deshalb **nicht** eingecheckt. Die bestehenden Entwicklungswebsite wurde auf `custom` mit genau dem Eigentümer als Betrachter umgestellt; die ursprüngliche öffentliche Website bleibt unverändert. Die Bilddateien dürfen nur in einem erneut als owner-private bestätigten Deployment-Archiv landen. Keine öffentlichen Bild-CDNs, kein `NEXT_PUBLIC`-Schlüssel als vermeintlicher Zugriffsschutz.

Zuordnung gemäß Seans Anhangreihenfolge:

1. 808 Nachtklub
2. BRICKS Club
3. AMANO Rooftop Bar am Berliner Hauptbahnhof
4. Weekend Club am Alexanderplatz

`lib/location-images.ts` besitzt die Zuordnung unabhängig von Veranstaltungen. Nur `Weekend Club` ist derzeit im vorhandenen Eventbestand vertreten (`soft-sunset`, „Above the City“). Die anderen drei Fotos sind vorbereitet; ohne bestätigte oder bereits vorhandene Eventdaten werden keine Veranstaltungen ergänzt und keine fremden Veranstaltungsorte umbenannt. Die AMANO-Aufnahme bleibt exakt die gelieferte Quelle, einschließlich eingebetteter Navigationspfeile im Foto; diese sind keine App-Schaltflächen.

Die Fotokarte kennzeichnet das bestehende Event weiterhin als Demo und nennt „Eintritt nicht bestätigt“. Der bestehende Preis bleibt ein Demo-Wert für die unveränderten Filter; es gibt keine bestätigten Preise oder neuen Ticketlinks. Die bestehende Detailansicht und ihre Demo-Kennzeichnung bleiben erhalten.

## Sichere lokale Vorbereitung

Standardbuilds aktivieren keine Fotos. Die private Variante wird explizit mit `NEXT_PUBLIC_NOCT_PRIVATE_LOCATION_IMAGES=1 npm run build` erstellt. Das Flag steuert nur die Darstellung, nicht die Sicherheit. Den Zugriff kontrolliert das Sites-Hosting vor der gesamten Website einschließlich statischer Bilder.

`node --import tsx scripts/prepare-private-photos.ts <Anhangordner> <externer Ausgabeordner>` verarbeitet exakt die vier nummerierten Anhänge. Es verwendet das bereits mit Next.js installierte Sharp, verändert keine Motive und erzeugt WebP in 360/640/960px sowie der jeweiligen Originalbreite ohne Verzerrung oder Hochskalieren; Metadaten werden entfernt. SHA256-Zuordnung steht im externen `provenance.json`. Der Ausgabeordner muss physisch außerhalb des Repositories liegen; auch Symlinks und Ordnernamen mit `..`-Präfix werden geprüft. Danach dürfen ausschließlich die sechzehn WebP-Dateien in `out/_private/club-photos/` des **geschützten** Buildartefakts kopiert werden. Keine Originale, Provenienzdatei oder Fotos unter getracktem `public/`. Nach dem Build vor jedem Upload den aktuellen owner-private Zugriff prüfen; bei unbekanntem oder öffentlichem Zugriff lokal bleiben.

`srcset`, `sizes`, Lazy Loading und asynchrones Decoding reduzieren den Bildtransfer. `sizes` berücksichtigt die breitere Bildfläche eines Landschaftsfotos beim 4:5-Cover-Ausschnitt und wählt auf Retina-Geräten bis zur Originalauflösung. CSS schneidet das Motiv passend auf 4:5 zu, verzerrt es aber nicht. Karten bleiben maximal 440px breit. Fehler beim Bildladen stellen die bisherige neutrale Karte wieder her; Favoriten und bestehende Eventdetails bleiben bedienbar. Andere Locations bekommen keine unpassenden Fotos. Die zusätzlichen Regeln sind auf `.photo-card` begrenzt.

`out/` bleibt ignoriert. Ein späterer öffentlicher Deploy muss einen sauberen Standardbuild ohne Foto-Flag und ohne private Bilddateien verwenden. Ein Wechsel der Entwicklungswebsite zurück zu öffentlich ist mit dieser Foto-Version ausdrücklich nicht erlaubt.

## Tatsächliche Prüfung

98 Tests, TypeScript und beide Produktionsvarianten (Standard und private Fotovariante) bestanden. Der Standardexport wurde anschließend auf null private Bilddateien geprüft. Alle 28 geschützten Karten-/Fassaden-/Dach-/Licht-/Tour-/Chat-/Filter-/Event-/Detaildateien stimmen mit dem freigegebenen Phase-3-Stand überein.

Die vollständige Root-App wurde in Chromium bei 1365×900, 390×844 mit Touch/DPR2, 320×568 und 768×1024 geprüft: 26 bestandene Verhaltensgruppen für Originalfoto, 4:5 ohne Verzerrung, Demo-/Preiskennzeichnung, Eventdetails, Favoriten samt Persistenz und Entfernen, bestehende Filter, Maus-/Touch-Karte und Bildfehler-Fallback. Separate Reduced-Motion-/Tastaturprüfung bestanden. Gemessener minimaler Weißtextkontrast über den gerenderten Bild-/Verlaufsflächen: 10,59:1 Desktop und 10,11:1 Mobil. Auf sehr kleinen Ansichten bleiben hohe Fotokarten innerhalb des vorhandenen Sheets scrollbar.

Der Browser wählte nach der Korrektur 960px am Desktop und 1280px für Weekend auf mobilen Retina-Ansichten. Die 640px-Varianten der vier Fotos sind 38–57KB groß; Weekend benötigt 78KB in 960px beziehungsweise 118KB in voller 1280px-Auflösung. Das ist keine Aussage über reale mobile Netzladezeiten oder Bildrate.

Der Pfadschutz wurde vor der Korrektur mit leeren Eingabeordnern für `..`-Präfix und Symlink reproduziert und danach mit identischem CLI-Test bestanden. Kein echtes Foto gelangte dabei in das Repository. Die Bildauswahl wurde vor der Korrektur als zu kleine Cover-Quelle reproduziert. Frühere Fehler in Browser-Testannahmen (zusätzliche SVG-Bildrolle und gecachtes Bild beim simulierten 404) wurden getrennt protokolliert.

Physischer iPhone-Safari-Test und reale Providerverfügbarkeit bleiben offen. Die Browserprüfung verwendet echte Berliner Grundrisse/-höhen als MVT-Replay und ein neutrales QA-Raster; die unveränderte App nutzt weiterhin ihre bisherigen Live-Kartenquellen. Evidenz, Screenshots und Bildprovenienz liegen außerhalb des öffentlichen Repositories unter `/workspace/work/noct-phase4-private/`.
