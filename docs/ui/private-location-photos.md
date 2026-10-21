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

`node --import tsx scripts/prepare-private-photos.ts <Anhangordner> <externer Ausgabeordner>` verarbeitet exakt die vier nummerierten Anhänge. Es verwendet das bereits mit Next.js installierte Sharp, verändert keine Motive und erzeugt WebP in 360/640/960px Breite ohne Verzerrung oder Hochskalieren; Metadaten werden entfernt. SHA256-Zuordnung steht im externen `provenance.json`. Der Ausgabeordner muss außerhalb des Repositories liegen. Danach dürfen ausschließlich die zwölf WebP-Dateien in `out/_private/club-photos/` des **geschützten** Buildartefakts kopiert werden. Keine Originale, Provenienzdatei oder Fotos unter getracktem `public/`. Nach dem Build vor jedem Upload den aktuellen owner-private Zugriff prüfen; bei unbekanntem oder öffentlichem Zugriff lokal bleiben.

`srcset`, `sizes`, Lazy Loading und asynchrones Decoding reduzieren den Bildtransfer. CSS schneidet das Motiv passend auf 4:5 zu, verzerrt es aber nicht. Fehler beim Bildladen stellen die bisherige neutrale Karte wieder her; Favoriten und bestehende Eventdetails bleiben bedienbar. Andere Locations bekommen keine unpassenden Fotos. Die zusätzlichen Regeln sind auf `.photo-card` begrenzt.

`out/` bleibt ignoriert. Ein späterer öffentlicher Deploy muss einen sauberen Standardbuild ohne Foto-Flag und ohne private Bilddateien verwenden. Ein Wechsel der Entwicklungswebsite zurück zu öffentlich ist mit dieser Foto-Version ausdrücklich nicht erlaubt.
