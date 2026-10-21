'use client';
import {useEffect,useRef,useState} from 'react';
import maplibregl,{type Map as GLMap} from 'maplibre-gl';
import {locationStops as events} from '@/lib/locations';import {imageryConfig} from '@/lib/imagery';import {BUILDING_LAYER,BUILDING_SOURCE,CITY_LIGHT} from '@/lib/buildings';
import {validateManifest,type BuildingManifest} from '@/prototypes/buildings/contract';
import {inspectGlb,MOBILE_BUDGET,DESKTOP_BUDGET,type GlbReport} from '@/prototypes/buildings/glb';
import {AssetSession} from '@/prototypes/buildings/session';
import type {BuildingModelLayer} from '@/prototypes/buildings/layer';
import styles from './viewer.module.css';

type Stats=GlbReport&{decodeMs:number;geometryBytes:number;firstDrawMs?:number;calls?:number;renderHz?:number};
const mib=(bytes:number)=>(bytes/1024/1024).toFixed(1)+' MiB';
const defaultEvent=events.find(e=>e.id==='location:weekend-club')!;
export default function BuildingLab(){
 const container=useRef<HTMLDivElement>(null),map=useRef<GLMap|null>(null),markerRef=useRef<maplibregl.Marker|null>(null),session=useRef(new AssetSession<BuildingModelLayer>()),layer=useRef<BuildingModelLayer|null>(null),revision=useRef(0);
 const [eventId,setEventId]=useState(defaultEvent.id),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[mapProblem,setMapProblem]=useState(''),[message,setMessage]=useState('Kein Berliner Mesh enthalten. Aktuell siehst du den bestehenden OSM-Fallback.'),[glb,setGlb]=useState<File|null>(null),[json,setJson]=useState<File|null>(null),[manifest,setManifest]=useState<BuildingManifest|null>(null),[stats,setStats]=useState<Stats|null>(null),[mobile,setMobile]=useState(true),[modelVisible,setModelVisible]=useState(false);
 const event=events.find(e=>e.id===eventId)!;const budget=mobile?MOBILE_BUDGET:DESKTOP_BUDGET;
 function removeModel(){
  revision.current++;const m=map.current;if(m?.getLayer('lab-textured-building'))m.removeLayer('lab-textured-building');session.current.clear();layer.current=null;
  if(m?.getLayer(BUILDING_LAYER.id))m.setLayoutProperty(BUILDING_LAYER.id,'visibility','visible');setManifest(null);setStats(null);setModelVisible(false);setBusy(false);
 }
 useEffect(()=>{
  const coarse=matchMedia('(pointer: coarse)').matches,navigatorInfo=navigator as Navigator&{deviceMemory?:number;connection?:{saveData?:boolean}};
  const constrained=coarse||navigator.hardwareConcurrency<=4||(navigatorInfo.deviceMemory??8)<=4||!!navigatorInfo.connection?.saveData;setMobile(constrained);
  if(!container.current)return;let m:GLMap;
  try{const style=imageryConfig().style;m=new maplibregl.Map({container:container.current,style:{...style,light:CITY_LIGHT,sources:{...style.sources,buildings:BUILDING_SOURCE},layers:[...style.layers,BUILDING_LAYER]},center:defaultEvent.coords,zoom:16.5,pitch:55,bearing:-20,pixelRatio:Math.min(devicePixelRatio||1,constrained?1.5:2),maxTileCacheSize:constrained?48:96,canvasContextAttributes:{antialias:true,powerPreference:'default'},attributionControl:{compact:true}});}catch(error){setMapProblem('WebGL-Karte konnte nicht starten: '+String(error));return;}
  map.current=m;const marker=new maplibregl.Marker({color:'#303841'}).setLngLat(defaultEvent.coords).addTo(m);markerRef.current=marker;
  const loaded=()=>{setReady(true);};const failed=()=>setMapProblem(previous=>previous||'Kartendaten konnten nicht vollständig geladen werden. Prüfe die Verbindung; dies ist kein Modellnachweis.');
  const hidden=()=>{if(document.hidden)m.stop();};const resize=new ResizeObserver(()=>m.resize());resize.observe(container.current);
  m.on('style.load',loaded);m.on('error',failed);document.addEventListener('visibilitychange',hidden);
  const currentSession=session.current;
  return()=>{revision.current++;resize.disconnect();document.removeEventListener('visibilitychange',hidden);m.off('style.load',loaded);m.off('error',failed);currentSession.clear();layer.current=null;marker.remove();markerRef.current=null;m.remove();map.current=null;};
 },[]);
 function fly(id=eventId){const target=events.find(e=>e.id===id)!,m=map.current;if(!m)return;markerRef.current?.setLngLat(target.coords);m.stop();m.flyTo({center:target.coords,zoom:16.8,pitch:55,bearing:m.getBearing()+45,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:1800});}
 async function load(){
  if(!glb||!json||!ready)return;const request=++revision.current,m=map.current!;setBusy(true);setMessage('Lokale Datei wird geprüft …');let parsed:BuildingManifest|undefined;
  try{
   let report!:GlbReport,decodeMs=0;const started=performance.now();
   const candidate=await session.current.replace(async signal=>{
    if(json.size>65536)throw Error('Manifest ist zu groß (maximal 64 KiB).');if(glb.size>budget.fileBytes)throw Error('Datei überschreitet das Gerätebudget '+mib(budget.fileBytes)+'.');
    parsed=validateManifest(JSON.parse(await json.text()),event);if(parsed.file!==glb.name)throw Error('Manifest und Modell-Dateiname passen nicht zusammen.');
    const bytes=await glb.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes),sha=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
    if(sha!==parsed.sha256)throw Error('SHA-256 stimmt nicht mit dem Manifest überein.');report=inspectGlb(bytes,budget);signal.throwIfAborted();
    const {prepareBuildingModel}=await import('@/prototypes/buildings/layer');signal.throwIfAborted();const begin=performance.now();
    const result=await prepareBuildingModel(bytes,parsed,budget);decodeMs=performance.now()-begin;return result;
   });
   if(request!==revision.current)return;
   if(m.getLayer(candidate.id))m.removeLayer(candidate.id);layer.current=candidate;
   let firstDrawMs:number|undefined,last=0,sampleStart=0,frames=0;candidate.onFrame=(calls,_triangles,first)=>{
    const now=performance.now();if(first)firstDrawMs=now-started;
    if(!m.isMoving()||document.hidden){sampleStart=0;frames=0;}else{if(!sampleStart)sampleStart=now;frames++;}
    if(first||now-last>700){last=now;const renderHz=sampleStart&&now-sampleStart>500?Math.round((frames-1)*1000/(now-sampleStart)):undefined;
     setStats({ ...report,textureBytes:candidate.metrics.textureBytes,decodeMs,geometryBytes:candidate.metrics.geometryBytes,firstDrawMs,calls,renderHz});}
   };
   candidate.onFailure=error=>queueMicrotask(()=>{if(layer.current!==candidate)return;removeModel();setMessage('Modell-Rendering fehlgeschlagen. OSM-Fallback aktiv: '+error.message);});
   m.addLayer(candidate);m.setLayoutProperty(BUILDING_LAYER.id,'visibility','none');setManifest(parsed!);setModelVisible(true);setStats({...report,textureBytes:candidate.metrics.textureBytes,decodeMs,geometryBytes:candidate.metrics.geometryBytes});setMessage('Lokales Modell geladen. Herkunft und Rechte sind Angaben des Manifests, keine automatische Lizenzprüfung.');m.triggerRepaint();
  }catch(error){if(request===revision.current){removeModel();setMessage('OSM-Fallback aktiv: '+(error instanceof Error?error.message:String(error)));}}
  finally{if(request===revision.current)setBusy(false);}
 }
 function template(){
  const draft={version:1,label:'Berlin – '+event.venue,file:'event-block.glb',sha256:'SHA256_DER_EIGENEN_GLB_DATEI',source:{url:'https://daten.berlin.de/datensaetze/3d-meshmodell-berlin',attribution:'QUELLENVERMERK_DER_KONKRETEN_DATEI',license:{name:'AKTUELLE_LIZENZ_PRUEFEN',url:'https://www.businesslocationcenter.de/berlin3d-downloadportal/resources/terms/terms.de.html',commercialUse:false,derivatives:false,redistribution:false,checkedOn:''}},georeference:{eventId:event.id,longitude:event.coords[0],latitude:event.coords[1],frame:'east-up-south-meters',flatMapGround:true,sourceCRS:'AUS_METADATEN',sourceVerticalDatum:'AUS_METADATEN',groundElevationMeters:null,conversionNote:'Tatsaechliche CRS-/Achsen-/Bodenkorrektur dokumentieren'}};
  const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='building-manifest.draft.json';a.click();URL.revokeObjectURL(url);
 }
 function toggle(){const m=map.current;if(!m?.getLayer('lab-textured-building'))return;const next=!modelVisible; m.setLayoutProperty('lab-textured-building','visibility',next?'visible':'none');m.setLayoutProperty(BUILDING_LAYER.id,'visibility',next?'none':'visible');setModelVisible(next);m.triggerRepaint();}
 return <main className={styles.lab}>
  <div ref={container} className={styles.map} aria-label="Isolierte Berliner Modell-Testkarte"/>
  <section className={styles.panel} aria-label="Gebäude-Prototyp">
   <h1>NOCT · Gebäude-Labor</h1><p>Technischer Import-Prototyp. Die NOCT-Hauptkarte bleibt unverändert.</p>
   <p className={styles.notice}>Das offizielle Mesh-Portal ist in Wartung. Es sind keine echten Berliner Mesh-Dateien enthalten. Kein Fotorealismus-Nachweis.</p>
   <label>Locationgebiet<select value={eventId} onChange={e=>{removeModel();setEventId(e.target.value);setMessage('OSM-Fallback aktiv. Passendes Modell für dieses Locationgebiet wählen.');fly(e.target.value);}}>{events.map(e=><option key={e.id} value={e.id}>{e.venue} · {e.district}</option>)}</select></label>
   <label>Lokales, eingebettetes GLB<input type="file" accept=".glb" onChange={e=>setGlb(e.target.files?.[0]??null)}/></label>
   <label>Georeferenz- und Quellenmanifest<input type="file" accept=".json,application/json" onChange={e=>setJson(e.target.files?.[0]??null)}/></label>
   <div className={styles.actions}><button onClick={load} disabled={!glb||!json||!ready||busy}>{busy?'Wird geprüft …':'Lokal prüfen & laden'}</button><button onClick={removeModel} disabled={!busy&&!manifest}>Import entfernen</button></div>
   <div className={styles.actions}><button onClick={()=>fly()} disabled={!ready}>Testflug</button><button onClick={toggle} disabled={!manifest}>{modelVisible?'OSM vergleichen':'Modell vergleichen'}</button></div>
   <button className={styles.secondary} onClick={template}>Ungeprüfte Manifest-Vorlage herunterladen</button>
   <p role="status" aria-live="polite">{message}</p>{mapProblem&&<p role="alert">{mapProblem}</p>}
   <p>Dateien bleiben im Browser. Nur die Hintergrundkarte lädt Daten vom Geoportal und OpenFreeMap.</p>
   <p>Gerätebudget: {mobile?'mobil / reduziert':'Desktop'} · Datei {mib(budget.fileBytes)} · Texturen geschätzt {mib(budget.textureBytes)} · {budget.textureSide}px pro Seite.</p>
   {manifest&&<p>Quelle: <a href={manifest.source.url} target="_blank" rel="noreferrer">{manifest.source.attribution}</a> · <a href={manifest.source.license.url} target="_blank" rel="noreferrer">{manifest.source.license.name}</a>. Lizenz laut Manifest geprüft am {manifest.source.license.checkedOn}.</p>}
   {stats&&<dl className={styles.stats}><dt>Modell-Datei</dt><dd>{mib(stats.fileBytes)}</dd><dt>Dreiecke / Bilder</dt><dd>{stats.triangles.toLocaleString('de-DE')} / {stats.images}</dd><dt>Geometrie-Buffer</dt><dd>{mib(stats.geometryBytes)}</dd><dt>RGBA + Mipmaps, geschätzt</dt><dd>{mib(stats.textureBytes)}</dd><dt>Parse / Vorbereitung</dt><dd>{Math.round(stats.decodeMs)} ms</dd><dt>Erster Zeichenaufruf</dt><dd>{stats.firstDrawMs===undefined?'noch ausstehend':Math.round(stats.firstDrawMs)+' ms'}</dd><dt>Modell-Draw-Calls</dt><dd>{stats.calls??'noch ausstehend'}</dd><dt>Render-Takt während Bewegung</dt><dd>{stats.renderHz===undefined?'noch kein Messfenster':stats.renderHz+' Hz'}</dd></dl>}
   <p>Messwerte betreffen dieses Gerät. Keine Messung des gesamten GPU-Speichers. Im Modellmodus sind OSM-Extrusionen nur in dieser Testansicht ausgeblendet.</p>
   <a href="https://github.com/sean536/noct/tree/feature/noct-3d/docs/prototypes" target="_blank" rel="noreferrer">Anleitung und Grenzen ↗</a>
  </section>
 </main>;
}
