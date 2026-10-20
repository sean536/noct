import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateManifest} from '../prototypes/buildings/contract';

// Synthetic metadata only: not a licence or elevation claim for a real Berlin asset.
export const area={id:'afterhours',coords:[13.44304,52.51117] as const};
export const manifest=()=>({version:1,label:'Synthetic unit fixture',file:'block.glb',sha256:'a'.repeat(64),source:{url:'https://example.org/source',attribution:'Test fixture only',license:{name:'Fixture licence',url:'https://example.org/license',commercialUse:true,derivatives:true,redistribution:true,checkedOn:'2026-10-20'}},georeference:{eventId:area.id,longitude:Number(area.coords[0]),latitude:Number(area.coords[1]),frame:'east-up-south-meters',flatMapGround:true,sourceCRS:'Fixture CRS',sourceVerticalDatum:'Fixture datum',groundElevationMeters:35,conversionNote:'Synthetic fixture; ground removed during preprocessing'}});

test('import accepts explicit provenance and a ground-aligned local metric frame at the chosen event',()=>{
 const value=manifest();assert.deepEqual(validateManifest(value,area),value,'a qualified local manifest must be accepted');
});
test('unresolved rights and unconverted/geographically unrelated models cannot pass the import gate',()=>{
 const rights=manifest();rights.source.license.commercialUse=false;
 assert.throws(()=>validateManifest(rights,area),/Lizenz/);
 const coordinates=manifest();coordinates.georeference.frame='UTM';assert.throws(()=>validateManifest(coordinates,area),/Koordinaten/);
 const remote=manifest();remote.georeference.longitude=13.8;assert.throws(()=>validateManifest(remote,area),/Eventgebiet/);
 const datum=manifest();datum.georeference.sourceVerticalDatum='';assert.throws(()=>validateManifest(datum,area),/Höhen/);
});
