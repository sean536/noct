import {test} from 'node:test';import assert from 'node:assert/strict';
import {berlinTileUrl,imageryConfig,isLoadedImageryEvent,BERLIN_CENTER,BERLIN_BOUNDS} from '../lib/imagery';
test('default imagery is a licensed keyless Berlin aerial WMS, without artificial buildings',()=>{
 const config=imageryConfig();const url=new URL(berlinTileUrl());assert.equal(url.hostname,'gdi.berlin.de');assert.equal(url.pathname,'/services/wms/dop_2025_fruehjahr');
 assert.equal(url.searchParams.get('LAYERS'),'dop_2025');assert.equal(url.searchParams.get('SRS'),'EPSG:3857');assert.equal(url.searchParams.get('VERSION'),'1.1.1');assert.equal(url.searchParams.get('BBOX'),'{bbox-epsg-3857}');assert.equal(url.searchParams.get('WIDTH'),'512');assert.equal(url.searchParams.get('FORMAT'),'image/jpeg');assert.equal(url.searchParams.has('key'),false);
 assert.ok(config.style.layers.some(l=>l.type==='raster'));assert.ok(!config.style.layers.some(l=>l.type==='fill-extrusion'));assert.match(config.attribution,/dl-de-zero-2.0/);
});
test('start point is inside Berlin; optional MapTiler requires an explicitly supplied public key',()=>{assert.ok(BERLIN_CENTER[0]>BERLIN_BOUNDS[0]&&BERLIN_CENTER[0]<BERLIN_BOUNDS[2]);assert.ok(BERLIN_CENTER[1]>BERLIN_BOUNDS[1]&&BERLIN_CENTER[1]<BERLIN_BOUNDS[3]);assert.equal(imageryConfig(' ').maptiler,false);const config=imageryConfig('test-key');assert.equal(config.maptiler,true);assert.match(JSON.stringify(config.style),/key=test-key/);assert.match(config.attribution,/MapTiler/)});

test('imagery is ready only after a real tile loads, not source metadata',()=>{
 assert.equal(isLoadedImageryEvent({sourceId:'imagery',sourceDataType:'content'}),false);
 assert.equal(isLoadedImageryEvent({sourceId:'imagery',sourceDataType:'metadata'}),false);
 assert.equal(isLoadedImageryEvent({sourceId:'imagery',tile:{state:'loading'}}),false);
 assert.equal(isLoadedImageryEvent({sourceId:'imagery',tile:{state:'errored'}}),false);
 assert.equal(isLoadedImageryEvent({sourceId:'another-source',tile:{state:'loaded'}}),false);
 assert.equal(isLoadedImageryEvent({sourceId:'imagery',tile:{state:'loaded'}}),true);
});
