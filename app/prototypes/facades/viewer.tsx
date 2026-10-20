'use client';
import {useEffect,useRef,useState} from 'react';
import maplibregl,{type Map as GLMap} from 'maplibre-gl';
import {BUILDING_LAYER,BUILDING_SOURCE,CITY_LIGHT} from '@/lib/buildings';
import {imageryConfig} from '@/lib/imagery';
import {events} from '@/lib/events';
import {fixtureBuildings,selectBuildings,facadeLod,localPoint,type BuildingFeature,type FacadeBuilding,type Point} from '@/prototypes/facades/data';
import type {FacadeLayer} from '@/prototypes/facades/layer';
import styles from './viewer.module.css';

const start=events.find(e=>e.id==='afro')!;
const comparisonSource='lab-comparison-footprints',comparisonLayer='lab-comparison-extrusions';
type Metrics=ReturnType<FacadeLayer['stats']>;
type Measurement={mode:'before'|'after';frames:number;renderHz:number;p95Ms:number;cpuMs:number;calls:number;geometryKiB:number;heapMiB:number|null};
type Bench={start:number;times:number[];mode:'before'|'after';timer:ReturnType<typeof setTimeout>};
export default function FacadeViewer(){
 const container=useRef<HTMLDivElement>(null),map=useRef<GLMap|null>(null),layer=useRef<FacadeLayer|null>(null),origin=useRef<Point>(start.coords),request=useRef(0),mounted=useRef(true),selected=useRef<FacadeBuilding[]>([]);
 const benchmark=useRef<Bench|null>(null),reduced=useRef(false),mobile=useRef(true),nightRef=useRef(true),shownRef=useRef(true),excluded=useRef(false);
 const [source,setSource]=useState('live'),[eventId,setEventId]=useState(start.id),[shown,setShown]=useState(true),[night,setNight]=useState(true),[reducedMotion,setReducedMotion]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('Warte auf echte OpenFreeMap-Gebäude …'),[problem,setProblem]=useState(''),[metrics,setMetrics]=useState<Metrics|null>(null),[measurements,setMeasurements]=useState<Measurement[]>([]);
 function restore(){const m=map.current;if(m?.getLayer(BUILDING_LAYER.id))m.setLayoutProperty(BUILDING_LAYER.id,'visibility','visible');if(m?.getLayer(comparisonLayer))m.removeLayer(comparisonLayer);if(m?.getSource(comparisonSource))m.removeSource(comparisonSource);excluded.current=false;}
 function remove(){request.current++;const m=map.current;if(m?.getLayer('lab-procedural-facades'))m.removeLayer('lab-procedural-facades');else layer.current?.dispose();layer.current=null;selected.current=[];restore();setMetrics(null);setBusy(false);}
 function show(value:boolean){cancelBench();shownRef.current=value;setShown(value);layer.current?.setShown(value);syncView(value);map.current?.triggerRepaint();}
 function syncView(value:boolean){
  const m=map.current;if(!m?.getLayer(BUILDING_LAYER.id))return;
  if(!selected.current.length){restore();return;}
  // Isolated comparison: only the same selected 16 footprints in either mode.
  // Visibility toggles avoid asynchronous source-filter rebucketing and transient double walls.
  m.setLayoutProperty(BUILDING_LAYER.id,'visibility','none');
  if(m.getLayer(comparisonLayer))m.setLayoutProperty(comparisonLayer,'visibility',value?'none':'visible');
  excluded.current=value;
 }
 async function build(features?:BuildingFeature[]){
  const m=map.current;if(!m||!m.isStyleLoaded()&& !m.getLayer(BUILDING_LAYER.id))return;
  const token=++request.current;setBusy(true);
  try{
   const {FacadeLayer:Layer}=await import('@/prototypes/facades/layer');if(!mounted.current||token!==request.current)return;
   const input=features??m.querySourceFeatures('buildings',{sourceLayer:'building'}) as BuildingFeature[];
   // Stable feature IDs are required in live mode; tile fragment ambiguity stays fallback.
   const result=selectBuildings(input.filter(f=>f.id!==undefined&&f.id!==null),origin.current,16);
   if(!result.buildings.length){setStatus('Noch keine geeigneten vollständigen Gebäude. Ansicht laden lassen und „Gebäude erfassen“ wählen; oder die klar gekennzeichnete Prüfszene nutzen.');return;}
   const began=performance.now(),next=new Layer(result.buildings,origin.current,mobile.current);next.setNight(nightRef.current);next.setShown(shownRef.current);
   if(m.getLayer(next.id))m.removeLayer(next.id);layer.current=next;selected.current=result.buildings;
   const data:GeoJSON.FeatureCollection={type:'FeatureCollection',features:result.buildings.map(b=>({type:'Feature',id:b.sourceId??b.id,properties:{render_height:b.height,render_min_height:0},geometry:b.geometry}))};
   const comparison=m.getSource(comparisonSource) as maplibregl.GeoJSONSource|undefined;
   if(comparison)comparison.setData(data);else{
    m.addSource(comparisonSource,{type:'geojson',data});
    const {['source-layer']:unused,...spec}=BUILDING_LAYER;void unused;
    m.addLayer({...spec,id:comparisonLayer,source:comparisonSource});
   }
   next.onFailure=error=>{queueMicrotask(()=>{if(layer.current!==next||!mounted.current)return;remove();setProblem(error.message+' OSM-Fallback wiederhergestellt.');});};
   next.onFirstFrame=()=>{if(!mounted.current||layer.current!==next)return;syncView(shownRef.current);setMetrics(next.stats());setStatus(`${result.buildings.length} Gebäude · erster Fassaden-Zeichenaufruf nach ${(performance.now()-began).toFixed(0)} ms. Details sind prozedural, keine erfassten Fassaden.`);};
   m.addLayer(next);syncView(shownRef.current);setMetrics(next.stats());m.triggerRepaint();
  }catch(error){if(token===request.current){remove();setProblem(String(error));}}
   finally{if(mounted.current&&token===request.current)setBusy(false);}
 }
 function cancelBench(){const b=benchmark.current;if(b){clearTimeout(b.timer);benchmark.current=null;}}
 function fly(){
  const m=map.current;if(!m)return;cancelBench();m.stop();
  m.easeTo({center:origin.current,zoom:17.5,pitch:62,bearing:m.getBearing()+95,duration:reduced.current?0:3200});
 }
 function measure(mode:'before'|'after'){
  const m=map.current;if(!m||reduced.current||!layer.current)return;cancelBench();m.stop();show(mode==='after');
  m.jumpTo({center:origin.current,zoom:17.25,pitch:60,bearing:-40});
  layer.current.resetCounters();
  const timer=setTimeout(()=>{
   const b=benchmark.current;if(!b||!mounted.current)return;benchmark.current=null;
   const deltas=b.times.slice(1).map((t,i)=>t-b.times[i]).filter(t=>t>0).sort((a,b)=>a-b);
   const span=b.times.length>1?b.times[b.times.length-1]-b.times[0]:0;
   const stats=layer.current?.stats(),memory=(performance as Performance&{memory?:{usedJSHeapSize:number}}).memory;
   const measurement:Measurement={mode,frames:b.times.length,renderHz:span?(b.times.length-1)*1000/span:0,p95Ms:deltas[Math.floor(deltas.length*.95)]??0,cpuMs:mode==='after'?(stats?.meanCpuMs??0):0,calls:mode==='after'?(stats?.calls??0):0,geometryKiB:mode==='after'?((stats?.geometryBytes??0)+(stats?.instanceBytes??0))/1024:0,heapMiB:memory?memory.usedJSHeapSize/1048576:null};
   setMeasurements(previous=>[...previous.filter(v=>v.mode!==mode),measurement]);setMetrics(stats??null);setStatus('Messflug abgeschlossen. Render-Takt und CPU-Zeit sind keine GPU-Zeit und kein iPhone-Nachweis.');
  },5400);
  benchmark.current={start:performance.now(),times:[],mode,timer};
  m.easeTo({center:origin.current,zoom:17.25,pitch:60,bearing:120,duration:5200,easing:t=>t});
 }
 useEffect(()=>{
  mounted.current=true;if(!container.current)return;
  const nav=navigator as Navigator&{deviceMemory?:number};mobile.current=matchMedia('(pointer:coarse)').matches||navigator.hardwareConcurrency<=4||(nav.deviceMemory??8)<=4;
  const motion=matchMedia('(prefers-reduced-motion:reduce)');reduced.current=motion.matches;setReducedMotion(motion.matches);
  const fixture=new URLSearchParams(location.search).get('fixture')==='1';setSource(fixture?'fixture':'live');
  const style=fixture?{version:8 as const,sources:{},layers:[{id:'base',type:'background' as const,paint:{'background-color':'#d8dbd6'}}]}:imageryConfig().style;
  let m:GLMap;
  try{m=new maplibregl.Map({container:container.current,style:{...style,light:CITY_LIGHT,sources:{...style.sources,...(!fixture?{buildings:BUILDING_SOURCE}:{})},layers:[...style.layers,...(!fixture?[BUILDING_LAYER]:[])]},center:start.coords,zoom:17.35,pitch:60,bearing:-30,maxZoom:20,minZoom:13,maxPitch:70,renderWorldCopies:false,pixelRatio:Math.min(devicePixelRatio||1,mobile.current?1.5:2),maxTileCacheSize:mobile.current?48:96,canvasContextAttributes:{antialias:true,powerPreference:'default'},attributionControl:{compact:true}});}
  catch(error){setProblem('WebGL konnte nicht starten: '+String(error));return;}
  map.current=m;let last=0,loadTimer:ReturnType<typeof setTimeout>|undefined;
  const capture=()=>{if(layer.current||loadTimer)return;loadTimer=setTimeout(()=>{loadTimer=undefined;if(mounted.current)void build();},500);};
  const loaded=()=>{
   remove();
   setReady(true);
   if(fixture){const features=fixtureBuildings(start.coords);if(!m.getSource('qa-buildings'))m.addSource('qa-buildings',{type:'geojson',data:{type:'FeatureCollection',features}});if(!m.getLayer(BUILDING_LAYER.id))m.addLayer({...BUILDING_LAYER,source:'qa-buildings','source-layer':undefined});void build(features);}
   else capture();
  };
  const data=(e:maplibregl.MapSourceDataEvent)=>{if(e.sourceId==='buildings'&&e.isSourceLoaded)capture();};
  const rendered=()=>{const now=performance.now(),b=benchmark.current;if(b&&m.isMoving())b.times.push(now);
   if(layer.current&&now-last>800){last=now;setMetrics(layer.current.stats());}
  };
  const failed=()=>{if(mounted.current)setProblem('Externe Kartendaten konnten nicht vollständig geladen werden. Die Prüfszene funktioniert separat ohne Netzverbindung.');};
  const stop=()=>{cancelBench();m.stop();};const visibility=()=>{if(document.hidden)stop();};const motionChange=()=>{reduced.current=motion.matches;setReducedMotion(motion.matches);if(motion.matches)stop();};
  const lodChanged=()=>{if(!layer.current)return;const p=localPoint([m.getCenter().lng,m.getCenter().lat],origin.current),visible=shownRef.current&&facadeLod(m.getZoom(),Math.hypot(...p)).visible;if(visible!==excluded.current)syncView(visible);};
  const contextLost=()=>{stop();setReady(false);setProblem('WebGL-Kontext unterbrochen. Darstellung wird nach Wiederherstellung neu aufgebaut.');};
  // MapLibre reconstructs its style asynchronously; rebuild only on the following style.load.
  const contextRestored=()=>{setProblem('');};
  const observer=new ResizeObserver(()=>m.resize());observer.observe(container.current);
  m.on('style.load',loaded);m.on('sourcedata',data);m.on('render',rendered);m.on('error',failed);m.on('dragstart',stop);m.on('zoomstart',e=>{if(e.originalEvent)cancelBench();});
  m.on('rotatestart',e=>{if(e.originalEvent)cancelBench();});m.on('move',lodChanged);m.on('webglcontextlost',contextLost);m.on('webglcontextrestored',contextRestored);
  document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',motionChange);
  return()=>{mounted.current=false;request.current++;cancelBench();if(loadTimer)clearTimeout(loadTimer);observer.disconnect();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',motionChange);m.remove();layer.current=null;map.current=null;};
 },[]);
 function exportMetrics(){const m=map.current;const data={recordedAt:new Date().toISOString(),source,origin:origin.current,userAgent:navigator.userAgent,devicePixelRatio,visibility:{original:m?.getLayoutProperty(BUILDING_LAYER.id,'visibility'),comparison:m?.getLayer(comparisonLayer)?m.getLayoutProperty(comparisonLayer,'visibility'):null,facades:shownRef.current},metrics:layer.current?.stats(),measurements,limitations:['Render cadence, not GPU time','JS heap excludes GPU/tile memory','Synthetic geometry is not Berlin building data']};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='noct-facade-comparison.json';a.click();URL.revokeObjectURL(url);}
 return <main className={styles.lab} data-testid="facade-lab" data-count={metrics?.buildings??0} data-ready={metrics?.ready?'true':'false'} data-mode={shown?'after':'before'}>
  <div ref={container} className={styles.map} aria-label="Isolierte MapLibre-Fassadenvorschau"/>
  <div className={styles.badge}>{source==='fixture'?'Synthetische Prüfgrundrisse · keine Berliner Gebäude':'OSM-Grundrisse · prozedurale Fassaden'}</div>
  <section className={styles.panel} aria-label="Fassaden-Prototyp">
   <h1>NOCT · Fassaden-Labor</h1><p>Isolierter Prototyp für bis zu 16 Gebäude. Die Hauptkarte bleibt unverändert.</p>
   <p className={styles.notice}>Fenster, Farben und Balkone sind deterministisch erzeugte Interpretationen. Keine fotografisch erfassten Berliner Fassaden.</p>
   <label>Datenquelle<select value={source} onChange={e=>{location.href=e.target.value==='fixture'?'/prototypes/facades/?fixture=1':'/prototypes/facades/';}}><option value="live">Live · bestehende OpenFreeMap-Quelle</option><option value="fixture">Offline-Prüfszene · synthetisch</option></select></label>
   {source==='live'&&<label>Vorhandenes Eventgebiet<select value={eventId} onChange={e=>{const event=events.find(v=>v.id===e.target.value)!;cancelBench();remove();setEventId(event.id);origin.current=event.coords;map.current?.stop();map.current?.easeTo({center:event.coords,zoom:17.35,pitch:60,duration:reduced.current?0:1600});setStatus('Neues Gebiet lädt. Danach Gebäude erfassen.');}}>{events.map(e=><option key={e.id} value={e.id}>{e.venue} · {e.district}</option>)}</select></label>}
   <div className={styles.actions}><button disabled={!ready||busy||source==='fixture'} onClick={()=>void build()}>Gebäude erfassen</button><button disabled={!metrics} aria-pressed={!shown} onClick={()=>show(false)}>Vorher · OSM</button><button disabled={!metrics} aria-pressed={shown} onClick={()=>show(true)}>Nachher · Fassaden</button></div>
   <div className={styles.actions}><button disabled={!ready} onClick={fly}>Schräger Testflug</button><button aria-pressed={night} onClick={()=>{cancelBench();nightRef.current=!night;setNight(!night);layer.current?.setNight(!night);}}>Fenster: {night?'Nacht':'Tag'}</button></div>
   <div className={styles.actions}><button disabled={!metrics||reducedMotion} onClick={()=>measure('before')}>Vorher messen</button><button disabled={!metrics||reducedMotion} onClick={()=>measure('after')}>Nachher messen</button></div>
   <p className={styles.status} role="status">{status}</p>{problem&&<p role="alert">{problem}</p>}
   {metrics&&<dl className={styles.stats}><dt>Gebäude / Balkone</dt><dd>{metrics.buildings} / {metrics.balconies}</dd><dt>Zusätzliche Draw Calls</dt><dd>{metrics.calls}</dd><dt>Dreiecke, inklusive Details</dt><dd>{metrics.triangles.toLocaleString('de-DE')}</dd><dt>Geometrie + Instanzen</dt><dd>{((metrics.geometryBytes+metrics.instanceBytes)/1024).toFixed(0)} KiB</dd><dt>Prozedurale Bildtexturen</dt><dd>{metrics.textures}</dd><dt>Three-Aufruf, CPU Ø</dt><dd>{metrics.meanCpuMs.toFixed(2)} ms</dd><dt>Leistungsreduktion</dt><dd>{metrics.reduced?'Balkone reduziert':'Standardbudget'}</dd></dl>}
   {measurements.map(v=><p key={v.mode} data-testid={`measurement-${v.mode}`}>{v.mode==='before'?'Vorher':'Nachher'}: {v.renderHz.toFixed(1)} Render/s · p95 {v.p95Ms.toFixed(1)} ms · JS-Heap {v.heapMiB===null?'nicht verfügbar':v.heapMiB.toFixed(1)+' MiB'}</p>)}
   <div className={styles.actions}><button disabled={!metrics} onClick={exportMetrics}>Messwerte exportieren</button></div>
   <p>Zoomen und Drehen sind aktiv. Keine automatische Tour der Haupt-App wird verändert. Balkone nur bei bekannten Wohngebäuden; komplexe oder unvollständige Geometrie bleibt im OSM-Fallback.</p>
  </section>
 </main>;
}
