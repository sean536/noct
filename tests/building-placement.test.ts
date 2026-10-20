import {test} from 'node:test';import assert from 'node:assert/strict';import {Vector3} from 'three';import {MercatorCoordinate} from 'maplibre-gl';import {modelMatrix} from '../prototypes/buildings/model';import type {BuildingManifest} from '../prototypes/buildings/contract';
test('local east/up/south meters align with the chosen geographic origin without automatic recentering',()=>{
 const m={georeference:{longitude:13.44304,latitude:52.51117}} as BuildingManifest;
 const origin=MercatorCoordinate.fromLngLat([13.44304,52.51117],0),s=origin.meterInMercatorCoordinateUnits(),matrix=modelMatrix(m);
 const p=new Vector3(100,10,20).applyMatrix4(matrix);assert.ok(Math.abs(p.x-origin.x-100*s)<1e-12,'east axis must be geographic, not arbitrary scene space');assert.ok(Math.abs(p.y-origin.y-20*s)<1e-12);assert.ok(Math.abs(p.z-10*s)<1e-12);
});
