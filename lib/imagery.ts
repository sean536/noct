import type {StyleSpecification} from 'maplibre-gl';
export const BERLIN_CENTER:[number,number]=[13.429,52.505];
export const BERLIN_BOUNDS:[number,number,number,number]=[13.09,52.33,13.77,52.68];
export const BERLIN_WMS='https://gdi.berlin.de/services/wms/dop_2025_fruehjahr';
export function berlinTileUrl(){
 return BERLIN_WMS+'?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=dop_2025&STYLES=&FORMAT=image%2Fjpeg&SRS=EPSG%3A3857&WIDTH=512&HEIGHT=512&BBOX={bbox-epsg-3857}';
}
export function imageryConfig(key?:string){
 const maptiler=Boolean(key?.trim());
 const attribution=maptiler?'<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">© MapTiler · Imagery providers</a>':'<a href="https://daten.berlin.de/datensaetze/digitale-farbige-orthophotos-2025-dop20rgbi-wms-6529de5a" target="_blank" rel="noopener noreferrer">Geoportal Berlin · DOP 2025</a> · <a href="https://www.govdata.de/dl-de/zero-2-0" target="_blank" rel="noopener noreferrer">dl-de-zero-2.0</a>';
 const source=maptiler?{type:'raster' as const,url:`https://api.maptiler.com/tiles/satellite/tiles.json?key=${encodeURIComponent(key!.trim())}`,tileSize:256}:{type:'raster' as const,tiles:[berlinTileUrl()],tileSize:512,minzoom:10,maxzoom:20,bounds:BERLIN_BOUNDS,attribution};
 const style:StyleSpecification={version:8,sources:{imagery:source},layers:[{id:'base',type:'background',paint:{'background-color':'#e7e7e4'}},{id:'aerial',type:'raster',source:'imagery',paint:{'raster-fade-duration':180,'raster-resampling':'linear','raster-opacity':1}}]};
 return {style,attribution,name:maptiler?'MapTiler Satellite':'Berlin · Luftbilder 2025',maptiler};
}

export interface ImagerySourceEvent {
 sourceId?: string;
 sourceDataType?: string;
 tile?: {state?: string};
}
export function isLoadedImageryEvent(event:ImagerySourceEvent){
 // MapLibre also emits source content events before requesting any image tiles.
 // Tile completion events carry a loaded tile, without requiring sourceDataType.
 return event.sourceId==='imagery'&&event.tile?.state==='loaded';
}
