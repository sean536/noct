import type {FillExtrusionLayerSpecification,VectorSourceSpecification,LightSpecification} from 'maplibre-gl';
export const BUILDING_SOURCE:VectorSourceSpecification={type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'<a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>'};
// Real OSM footprints. Heights are provider estimates from height/levels, not surveyed LoD2.
// Do not generate geometry or invent a fixed height for missing data.
export const BUILDING_LAYER:FillExtrusionLayerSpecification={id:'real-buildings',type:'fill-extrusion',source:'buildings','source-layer':'building',minzoom:14,filter:['all',['has','render_height'],['>', ['get','render_height'],0],['!=',['get','hide_3d'],true]],paint:{'fill-extrusion-color':['interpolate',['linear'],['get','render_height'],0,'#bcb5a6',30,'#d1cabb',80,'#e2dccf'],'fill-extrusion-height':['get','render_height'],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true}};

// Directional face shading supported by MapLibre5; no facade textures or cast-shadow claims.
export const CITY_LIGHT:LightSpecification={anchor:'map',color:'#fff4df',intensity:.4,position:[1.4,205,40]};
