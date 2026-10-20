import type {FeatureCollection, Feature, Polygon, LineString} from 'geojson';
// Schematic fallback only: these blocks are NOT cadastral building data.
export function offlineGeometry(){
 const blocks:Feature<Polygon>[]=[]; const roads:Feature<LineString>[]=[];
 for(let x=0;x<38;x++) for(let y=0;y<34;y++) {
  const lon=13.354+x*.0032,lat=52.462+y*.0019;
  const river=52.518-(lon-13.395)*.25;
  if(Math.abs(lat-river)<.0015&&lon>13.389) continue;
  for(let a=0;a<2;a++)for(let b=0;b<2;b++) {
   const l=lon+a*.00145+.00017,t=lat+b*.00086+.00012;
   blocks.push({type:'Feature',properties:{height:9+((x*19+y*7+a*3+b*13)%33)},geometry:{type:'Polygon',coordinates:[[[l,t],[l+.0011,t],[l+.0011,t+.00061],[l,t+.00061],[l,t]]]}});
  }
 }
 for(let i=0;i<39;i++)roads.push({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[13.354+i*.0032,52.462],[13.354+i*.0032,52.527]]}});
 for(let i=0;i<35;i++)roads.push({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[13.354,52.462+i*.0019],[13.479,52.462+i*.0019]]}});
 const water:Feature<Polygon>={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[13.389,52.52],[13.406,52.517],[13.419,52.515],[13.434,52.511],[13.444,52.509],[13.457,52.505],[13.478,52.498],[13.479,52.4965],[13.456,52.5035],[13.443,52.5075],[13.433,52.5095],[13.418,52.5135],[13.405,52.5155],[13.388,52.5185],[13.389,52.52]]]}};
 const fc=(features:Feature[]):FeatureCollection=>({type:'FeatureCollection',features});return {blocks:fc(blocks),roads:fc(roads),water:fc([water])};
}
