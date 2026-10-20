# Luftbildquelle und Anbieterwahl

Stand:20.10.2026. Stack unverändert: MapLibre GL JS5.20.0, Next16, React19.

| Quelle | Bildqualität / Auflösung | Kosten und Zugang | Lizenz / Integration | Entscheidung |
| --- | --- | --- | --- | --- |
| Geoportal Berlin DOP2025 | Offizielle Luftbilder, nominell20cm Bodenauflösung; lokale Schärfe nicht visuell gemessen. | Open Data, kein API-Key; keine garantierte SLA. | dl-de-zero-2.0 erlaubt kommerzielle Nutzung. WMS-Raster,EPSG:3857,512px Kacheln. | Standard für Berlin. |
| MapTiler Satellite | Weltweite Satelliten-/Luftbilder, Detailgrad regional unterschiedlich; Berlin-Auflösung nicht gemessen. | Free:Testing/PoC/Prototyping,100.000 API-Requests/Monat,Logo; Flex aktuell30USD/Monat plus Mehrverbrauch. Konto/Key. | Tarif-/Bildquellen-Nachweise; TileJSON direkt in MapLibre. | Optionale explizite Alternative. |
| Esri World Imagery | Weltweite Imagery, regionaler Detailgrad/Aufnahmedatum; Berlin nicht visuell geprüft. | ArcGIS Location Platform Konto/API-Key; aktuell2M Basemap-Tiles/Monat frei, danach0,15USD/1000Tiles. | Esri-/Datenquellen-Attribution/Plattformbedingungen. Offizielles MapLibre-Raster-Beispiel. | Kein unnötiges Konto für Berlin. |
| Berlin TrueOrthophotos Sommer2025 / WMTS | Offiziell20cm, lagerichtige Dächer ohne künstliche3D-Modelle. | Open Data ohne Key. | dl-de-zero-2.0; WMTS-Matrix/Layerdetails hier nicht geprüft. | Geeignete weitere Quelle; unbestätigtes WMTS-Template nicht eingebaut. |

Quellen:

- [Berlin DOP2025 WMS](https://daten.berlin.de/datensaetze/digitale-farbige-orthophotos-2025-dop20rgbi-wms-6529de5a), [Lizenztext](https://www.govdata.de/dl-de/zero-2-0)
- [Berlin TrueOrthophotos Sommer2025](https://daten.berlin.de/datensaetze/digitale-farbige-trueorthophotos-sommer-2025-truedop20rgbi-wms-d714b73c)
- [MapTiler Tarife](https://www.maptiler.com/cloud/pricing/), [Rasterquellen/Schlüssel](https://docs.maptiler.com/gl-style-specification/sources/)
- [Esri MapLibre World Imagery](https://developers.arcgis.com/maplibre-gl-js/maps/raster-tile-basemaps/display-multiple-basemap-layers/), [Tarife](https://developers.arcgis.com/pricing/)
- [MapLibre WMS-Prinzip](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-wms-source/). Online-Beispiel neuer; API gegen installierte5.20-Typen geprüft.

## Standard: kein Schlüssel erforderlich

`lib/imagery.ts`: Geoportal Berlin, Endpunkt `https://gdi.berlin.de/services/wms/dop_2025_fruehjahr`, Layer `dop_2025`, GetMap1.1.1/SRS EPSG:3857. Quelle/Lizenz mobil sichtbar. Zoom/Drag/Rotation über MapLibre, Start Kreuzberg/Friedrichshain. Kein dunkler Filter oder künstliche Ersatzstadt.

## Optional MapTiler

1. Konto/geeigneten Tarif und öffentlichen API-Key einrichten.
2. `.env.example` nach `.env.local` kopieren und `NEXT_PUBLIC_MAPTILER_KEY=dein_key` setzen.
3. Dev-Server neu starten bzw. `npm run build` erneut ausführen.
4. Produktionsdomain im Anbieter-Dashboard einschränken. NEXT_PUBLIC-Keys sind im Browser sichtbar; keine geheimen Server-Schlüssel verwenden.
5. Tarif/Attribution vor Produktivnutzung prüfen. MapTiler-Link wird angezeigt. Kein automatischer Wechsel auf kostenpflichtige Dienste.

## Nachweisgrenzen

Netzwerkpolicy dieser Arbeitsumgebung blockiert Bilddaten (CONNECT403). Kein nachgewiesener Fehler des Berliner Dienstes. Web-Extractor konnte GetMap ebenfalls nicht laden. Bildqualität, CORS und erkennbare Dächer sind nicht visuell bestätigt. Kacheln werden im Zielbrowser direkt vom Anbieter geladen; Fehlerhinweis/Retry statt künstlicher Stadt. Erst ein erfolgreich geladenes Bildkachel-Ereignis steuert den Ladestatus; Quellen-Metadaten reichen nicht aus.

Gerätetest: Link auf iPhone öffnen, Luftbilder müssen sichtbar sein. Zoomen/verschieben/drehen, danach QuickReply, Enter/Senden, Details/Merkliste. Bei reduzierter Bewegung keine Einführungs-Kamerafahrt.
