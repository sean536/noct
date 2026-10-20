export type EventArea = {id:string; coords:readonly [number,number]};
export type BuildingManifest = {
 version:1; label:string; file:string; sha256:string;
 source:{url:string; attribution:string; license:{name:string; url:string; commercialUse:true; derivatives:true; redistribution:true; checkedOn:string}};
 georeference:{eventId:string; longitude:number; latitude:number; frame:'east-up-south-meters'; flatMapGround:true; sourceCRS:string; sourceVerticalDatum:string; groundElevationMeters:number; conversionNote:string};
};
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown)=>typeof value==='string'&&value.trim().length>0&&value.length<=2000;
const https=(value:unknown)=>{try{const u=new URL(String(value));return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
export function validateManifest(value:unknown,event:EventArea):BuildingManifest {
 const m=record(value),s=record(m.source),l=record(s.license),g=record(m.georeference);
 if(m.version!==1||!text(m.label)||typeof m.file!=='string'||!/^[-\w. ]+\.glb$/i.test(m.file)||typeof m.sha256!=='string'||!/^[a-f0-9]{64}$/.test(m.sha256))throw Error('Manifest: Version, Dateiname oder SHA-256 fehlt.');
 if(!https(s.url)||!text(s.attribution)||!text(l.name)||!https(l.url)||l.commercialUse!==true||l.derivatives!==true||l.redistribution!==true||typeof l.checkedOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(l.checkedOn)||!Number.isFinite(Date.parse(l.checkedOn)))throw Error('Lizenz und Herkunft müssen im Manifest ausdrücklich dokumentiert sein.');
 if(g.frame!=='east-up-south-meters'||g.flatMapGround!==true)throw Error('Koordinaten: ein in Meter umgerechnetes, am Kartenboden ausgerichtetes Modell ist nötig.');
 if(!text(g.sourceCRS)||!text(g.sourceVerticalDatum)||!text(g.conversionNote)||typeof g.groundElevationMeters!=='number'||!Number.isFinite(g.groundElevationMeters))throw Error('Quell-Koordinaten und Höhenbezug samt Konvertierung fehlen.');
 if(typeof g.longitude!=='number'||typeof g.latitude!=='number'||!Number.isFinite(g.longitude)||!Number.isFinite(g.latitude)||g.eventId!==event.id)throw Error('Eventgebiet und Koordinaten stimmen nicht überein.');
 const north=(g.latitude-event.coords[1])*111320,east=(g.longitude-event.coords[0])*111320*Math.cos(event.coords[1]*Math.PI/180);
 if(Math.hypot(east,north)>300)throw Error('Modellursprung liegt außerhalb des kleinen Eventgebiets (300 m).');
 return value as BuildingManifest;
}
