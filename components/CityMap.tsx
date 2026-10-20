'use client';
import {useEffect,useRef,useState} from 'react';
import maplibregl,{type Map as GLMap} from 'maplibre-gl';
import {Map as MapIcon,RotateCcw} from 'lucide-react';
import {events,type NightEvent} from '@/lib/events';
import {BERLIN_CENTER,BERLIN_BOUNDS,imageryConfig,isLoadedImageryEvent} from '@/lib/imagery';
import {BUILDING_SOURCE,BUILDING_LAYER,CITY_LIGHT} from '@/lib/buildings';
import {renderProfile,FrameBudget,distanceKm,cameraEase} from '@/lib/rendering';
import {TilePrefetcher,neighborhoodURLs,LoadedTargetTiles} from '@/lib/tile-prefetch';
import {SceneFlight,type FlightPhase} from '@/lib/scene-flight';
import {cameraPlan,arrivalBearing,FINAL_ZOOM,targetRegion} from '@/lib/camera-plan';
import type {TourStop} from '@/lib/tour';
import {EventTour} from '@/lib/tour';
import {TrafficLayer} from '@/lib/traffic-layer';
import {buildingLayerWithFacades} from '@/lib/facade-state';
import type {FacadeMap} from '@/lib/facade-map';
export interface MapCommand {id:number;action:'center'|'zoom-in'|'zoom-out'}
export interface FocusRequest {id:number;eventId:string;allowWhileDialog?:boolean}
interface Props {onSelect:(e:NightEvent)=>void;activeIds:string[]|null;typing:boolean;blocked:boolean;panelOpen:boolean;searching:boolean;focusRequest:FocusRequest|null;command:MapCommand|null;onDiagnostics:(text:string)=>void}
type MapStatus='loading'|'online'|'error'|'webgl';
const tourIds=['bar','afterhours','soft-sunset','hiphop'];
export default function CityMap({onSelect,activeIds,typing,blocked,panelOpen,searching,focusRequest,command,onDiagnostics}:Props){
 const host=useRef<HTMLDivElement>(null),map=useRef<GLMap|null>(null),tour=useRef<EventTour|null>(null);
 const callbacks=useRef({onSelect,onDiagnostics}),inputs=useRef({typing,blocked,panelOpen,searching,activeIds,focusRequest});
 callbacks.current={onSelect,onDiagnostics};inputs.current={typing,blocked,panelOpen,searching,activeIds,focusRequest};
 const trafficRef=useRef<TrafficLayer|null>(null),recoverHandler=useRef<()=>void>(()=>{});
 const commandHandler=useRef<((action:MapCommand['action'])=>void)|null>(null);
 const pins=useRef<{id:string;el:HTMLButtonElement}[]>([]),highlight=useRef<(e:NightEvent|null)=>void>(()=>{});
 const [status,setStatus]=useState<MapStatus>('loading'),[retry,setRetry]=useState(0);
 const config=imageryConfig(process.env.NEXT_PUBLIC_MAPTILER_KEY);
 useEffect(()=>{
  if(!host.current)return;
  const container=host.current,media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let instance:GLMap|undefined,controller:EventTour|undefined,label:maplibregl.Marker|undefined,flight:SceneFlight|undefined;
  let disposed=false,hasImagery=false,hasBuildings=false,dataReady=false;
  const imagery=imageryConfig(process.env.NEXT_PUBLIC_MAPTILER_KEY);
  const nav=navigator as Navigator & {deviceMemory?:number;connection?:{saveData?:boolean}};
  const profile=renderProfile({dpr:window.devicePixelRatio,width:container.clientWidth,height:container.clientHeight,cores:nav.hardwareConcurrency||4,memory:nav.deviceMemory,coarse:window.matchMedia('(pointer: coarse)').matches,saveData:!!nav.connection?.saveData});
  const frameBudget=new FrameBudget(profile.pixelRatio),prefetch=new TilePrefetcher(),loadedTiles=new LoadedTargetTiles();
  let warmTarget:TourStop|undefined,lastArrival='',lastTraffic='';
  let traffic:TrafficLayer|undefined,recovery:ReturnType<typeof setTimeout>|undefined,facades:FacadeMap|undefined;let facadeGeneration=0;const touches=new Set<number>();
  const began=performance.now();let firstImagery:number|undefined,firstBuildings:number|undefined,lastReport='',lastFrameP75:number|undefined;
  let labelEventId:string|undefined,labelName:HTMLElement|undefined,labelPlace:HTMLElement|undefined,labelTime:HTMLElement|undefined;
  const byId=new Map(events.map(e=>[e.id,e]));
  const report=()=>{
   const text=`${imagery.name}: ${hasImagery?'Bildkacheln geladen':'noch nicht geladen'}${firstImagery!==undefined?` (${Math.round(firstImagery)} ms)`:''}. 3D: ${hasBuildings?'OSM-Gebäude dargestellt':'noch nicht bestätigt'}${firstBuildings!==undefined?` (${Math.round(firstBuildings)} ms)`:''}. Qualität: ${profile.tier}, DPR ${instance?.getPixelRatio().toFixed(2)||profile.pixelRatio.toFixed(2)}${lastFrameP75?`, Render-Abstand p75 ${Math.round(lastFrameP75)} ms`:''}.${lastArrival}${lastTraffic}`;
   if(text!==lastReport){lastReport=text;callbacks.current.onDiagnostics(text)}
  };
  const timeout=setTimeout(()=>{if(disposed)return;if(!hasImagery)setStatus('error');report()},15000);
  const scheduleRecovery=()=>{
   if(recovery)clearTimeout(recovery);recovery=undefined;
   const state=inputs.current;
   if(disposed||touches.size||document.hidden||media.matches||state.typing||state.blocked||state.panelOpen||state.searching||!controller?.needsRecovery())return;
   recovery=setTimeout(()=>{recovery=undefined;if(instance?.isMoving()){scheduleRecovery();return;}const current=inputs.current;if(!document.hidden&&!media.matches&&!current.typing&&!current.blocked&&!current.panelOpen&&!current.searching)controller?.resume()},6000);
  };
  recoverHandler.current=scheduleRecovery;
  const syncTraffic=()=>{const state=inputs.current;traffic?.setActive(!document.hidden&&!media.matches&&!state.typing&&!state.blocked&&!state.panelOpen)};
  const manual=()=>{controller?.pause('manual');scheduleRecovery()};
  const pointerStart=(event:PointerEvent)=>{touches.add(event.pointerId);manual()};
  const pointerEnd=(event:PointerEvent)=>{if(touches.delete(event.pointerId))scheduleRecovery()};
  const visibility=()=>{if(document.hidden){touches.clear();controller?.pause('hidden')}else controller?.release('hidden');syncTraffic();scheduleRecovery()};
  const motion=()=>{if(media.matches)controller?.pause('reduced');else controller?.release('reduced');syncTraffic();scheduleRecovery()};
  try{
   instance=new maplibregl.Map({container,style:{...imagery.style,light:CITY_LIGHT,sources:{...imagery.style.sources,buildings:BUILDING_SOURCE},layers:[...imagery.style.layers,buildingLayerWithFacades(BUILDING_LAYER)]},center:BERLIN_CENTER,zoom:11.5,pitch:35,bearing:0,attributionControl:false,minZoom:10,maxZoom:19,maxBounds:BERLIN_BOUNDS,minPitch:30,maxPitch:65,renderWorldCopies:false,maxTileCacheSize:profile.cacheTiles,pixelRatio:profile.pixelRatio,canvasContextAttributes:{antialias:profile.antialias,preserveDrawingBuffer:false,powerPreference:profile.tier==='economy'?'low-power':'high-performance'},cancelPendingTileRequestsWhileZooming:!profile.progressive,fadeDuration:media.matches?0:180});
   map.current=instance;
   if(imagery.maptiler)instance.addControl(new maplibregl.AttributionControl({compact:false}),'bottom-right');
   highlight.current=(event)=>{
    if(!event){label?.remove();label=undefined;labelEventId=undefined;return;}
    if(!instance||labelEventId===event.id)return;
    labelEventId=event.id;pins.current.forEach(p=>p.el.classList.toggle('pin-active',p.id===event.id));
    if(!label){
     const el=document.createElement('button');el.className='event-map-label';const tag=document.createElement('small');tag.textContent='DEMO';
     labelName=document.createElement('strong');labelPlace=document.createElement('span');labelTime=document.createElement('span');labelTime.className='label-time';
     el.append(tag,labelName,labelPlace,labelTime);el.onclick=()=>{const selected=labelEventId&&byId.get(labelEventId);if(selected){controller?.pause('manual');callbacks.current.onSelect(selected)}};
     label=new maplibregl.Marker({element:el,anchor:'bottom',offset:[0,-50]}).setLngLat(event.coords).addTo(instance);
    }
    labelName!.textContent=event.name;labelPlace!.textContent=event.venue;labelTime!.textContent=event.time+' Uhr';
    label.getElement().setAttribute('aria-label',`Demo-Event ${event.name}, ${event.venue}, ${event.time} Uhr. Event ansehen`);
    label.setLngLat(event.coords);
   };
   const warmStop=(stop:TourStop|undefined)=>{
    warmTarget=stop;
    if(!profile.prefetch||!stop||!instance||document.hidden)return;
    const vector=instance.getSource('buildings') as maplibregl.VectorTileSource|undefined;
    const raster=instance.getSource('imagery') as maplibregl.RasterTileSource|undefined;
    // Vector geometry first, then a bounded high-resolution aerial neighborhood.
    // Native source maxzoom and the raster's actual tileSize determine request levels.
    prefetch.warm([
     ...(vector?.tiles?.[0]?neighborhoodURLs(vector.tiles[0],stop.coords,Math.min(16,vector.maxzoom),220,4):[]),
     ...(!imagery.maptiler&&raster?.tiles?.[0]?neighborhoodURLs(raster.tiles[0],stop.coords,Math.min(raster.maxzoom,Math.round(16.6+Math.log2(512/raster.tileSize)))):[])
    ]);
   };
   controller=new EventTour(tourIds.map(id=>events.find(e=>e.id===id)!),{
    stop:()=>{flight?.cancel();flight=undefined;prefetch.warm([]);warmTarget=undefined;if(label)label.getElement().style.visibility='';instance?.stop()},
    fly:(stop,intro,done)=>{
     if(!instance)return;
     const scene=instance;
     warmStop(stop);
     // Hide the new destination label until the target has been drawn (or the bounded fallback).
     if(label)label.getElement().style.visibility='hidden';
     const here=scene.getCenter(),bearing=arrivalBearing([here.lng,here.lat],stop.coords),region=targetRegion(stop.coords);
     const duration=media.matches?0:intro?3200:Math.min(4600,Math.max(2600,Math.round(2300+distanceKm([here.lng,here.lat],stop.coords)*350)));
     let end:(()=>void)|undefined,descended=false;
     const move=(phase:FlightPhase,ms:number)=>{
      if(end)scene.off('moveend',end);scene.stop();if(end)scene.on('moveend',end);
      if(phase==='descent')descended=true;
      const target=cameraPlan(stop.coords,bearing,profile.pitch,phase,descended);
      if(media.matches)scene.jumpTo(target);
      else if(intro&&phase==='cruise')scene.flyTo({...target,duration:ms,easing:cameraEase,curve:1.2,essential:false});
      else scene.easeTo({...target,duration:ms,easing:cameraEase,essential:false});
     };
     flight=new SceneFlight({
      move,
      sample:()=>{
       const vector=scene.getSource('buildings') as maplibregl.VectorTileSource|undefined;
       const raster=scene.getSource('imagery') as maplibregl.RasterTileSource|undefined;
       if(!vector||!raster)return {approachReady:false,finalReady:false};
       const buildingZoom=Math.min(16,vector.maxzoom),rasterZoom=Math.min(raster.maxzoom,Math.round(FINAL_ZOOM+Math.log2(512/raster.tileSize)));
       const geometryLoaded=loadedTiles.hasRegion('buildings',region,buildingZoom);
       const sourcesLoaded=scene.isSourceLoaded('buildings')&&scene.isSourceLoaded('imagery')&&scene.areTilesLoaded();
       const point=scene.project(stop.coords),width=container.clientWidth,height=container.clientHeight;
       const finalRegion=scene.getZoom()>=FINAL_ZOOM-.12?[-80,0,80].flatMap(dx=>[-80,0,80].map(dy=>{const p=scene.unproject([Math.max(12,Math.min(width-12,point.x+dx)),Math.max(12,Math.min(height-12,point.y+dy))]);return [p.lng,p.lat] as [number,number]})):[];
       const finalTiles=geometryLoaded&&finalRegion.length>0&&loadedTiles.hasRegion('imagery',finalRegion,rasterZoom)&&loadedTiles.hasRegion('buildings',finalRegion,buildingZoom);
       const currentImagery=loadedTiles.has('imagery',stop.coords,Math.min(raster.maxzoom,Math.round(scene.getZoom()+Math.log2(512/raster.tileSize))));
       // This warms bytes only: final GPU/visual readiness is rechecked during descent/reveal.
       const futureImages=!profile.prefetch||imagery.maptiler||!!raster.tiles?.[0]&&prefetch.ready(neighborhoodURLs(raster.tiles[0],stop.coords,rasterZoom));
       let buildingsVisible=false;
       if(geometryLoaded&&sourcesLoaded&&scene.getLayer('real-buildings')){
        if(point.x>=0&&point.x<=width&&point.y>=0&&point.y<=height)buildingsVisible=scene.queryRenderedFeatures([[Math.max(0,point.x-110),Math.max(0,point.y-110)],[Math.min(width,point.x+110),Math.min(height,point.y+110)]],{layers:['real-buildings']}).length>0;
       }
       if(buildingsVisible&&!hasBuildings){hasBuildings=true;firstBuildings=performance.now()-began;report()}
       return {approachReady:geometryLoaded&&currentImagery&&sourcesLoaded&&buildingsVisible&&futureImages,finalReady:finalTiles&&sourcesLoaded&&buildingsVisible&&scene.getZoom()>=FINAL_ZOOM-.12&&scene.getPitch()>=profile.pitch-2};
      },
      prepareNext:()=>warmStop(controller?.nextStop()),
      present:()=>{if(label)label.getElement().style.visibility=''},
      subscribe:(render,moveEnd)=>{end=moveEnd;scene.on('render',render);scene.on('moveend',moveEnd);return()=>{end=undefined;scene.off('render',render);scene.off('moveend',moveEnd)}},
      repaint:()=>scene.triggerRepaint(),stop:()=>scene.stop(),now:()=>performance.now(),
      later:(fn,ms)=>setTimeout(fn,ms),cancel:timer=>clearTimeout(timer as ReturnType<typeof setTimeout>)
     },duration,media.matches,result=>{
      flight=undefined;if(label)label.getElement().style.visibility='';
      const event=byId.get(stop.id);
      lastArrival=` Letzte Zielansicht${event?` (${event.venue})`:''}: ${Math.round(result.elapsed)} ms, ${result.ready?'Nahansicht mit Zielregion nach Render bestätigt':result.descended?'Nahansicht; Details noch nicht vollständig bestätigt':'höherer Vorbeiflug als Lade-Fallback'}.`;
      report();done();scheduleRecovery();
     });
     flight.start();
    },
    highlight:stop=>highlight.current(stop?byId.get(stop.id)||null:null),
    now:()=>performance.now(),
    later:(fn,ms)=>setTimeout(fn,ms),cancel:timer=>clearTimeout(timer as ReturnType<typeof setTimeout>)
   });tour.current=controller;
   const initial=inputs.current;
   if(initial.typing)controller.pause('typing');if(initial.blocked)controller.pause('ui');if(initial.panelOpen)controller.pause('panel');if(initial.searching)controller.pause('request');
   visibility();motion();
   // Reduced motion gets a useful stationary view, with no automatic tour.
   if(media.matches)instance.jumpTo({center:BERLIN_CENTER,zoom:15,pitch:40});
   for(const event of events){
    const el=document.createElement('button');el.className='event-pin';el.setAttribute('aria-label',`Demo: ${event.name}, ${event.venue}`);
    const symbol=document.createElement('span');symbol.className='pin-symbol';symbol.textContent=event.genre==='Techno'?'↯':event.genre==='Rooftop'?'☼':'•';el.append(symbol);
    el.classList.toggle('pin-muted',initial.activeIds!==null&&!initial.activeIds.includes(event.id));
    el.onclick=()=>{controller?.pause('manual');highlight.current(event);callbacks.current.onSelect(event)};
    new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat(event.coords).addTo(instance);pins.current.push({id:event.id,el});
   }
   container.addEventListener('pointerdown',pointerStart,{passive:true});container.addEventListener('wheel',manual,{passive:true});container.addEventListener('keydown',manual);window.addEventListener('pointerup',pointerEnd,{passive:true});window.addEventListener('pointercancel',pointerEnd,{passive:true});
   document.addEventListener('visibilitychange',visibility);media.addEventListener('change',motion);
   instance.on('style.load',()=>{if(disposed)return;instance?.setSourceTileLodParams(profile.lodLevels,profile.lodRatio);if(instance){traffic=new TrafficLayer(profile,text=>{lastTraffic=' '+text;report()});trafficRef.current=traffic;instance.addLayer(traffic);syncTraffic();instance.on('moveend',scheduleRecovery)}controller?.start();report();
    const generation=++facadeGeneration;facades?.destroy();facades=undefined;
    void import('@/lib/facade-map').then(({FacadeMap})=>{if(!disposed&&instance&&generation===facadeGeneration)facades=new FacadeMap(instance,{mobile:profile.tier==='economy'||media.matches||window.matchMedia('(pointer: coarse)').matches});}).catch(()=>{/* Original buildings remain the fallback if the optional renderer cannot load. */});
   });
   instance.on('sourcedata',e=>{
    if(disposed)return;
    loadedTiles.record(e);
    if(!e.tile&&warmTarget)warmStop(warmTarget);
    if(isLoadedImageryEvent(e)&&!hasImagery){hasImagery=true;firstImagery=performance.now()-began;setStatus('online');clearTimeout(timeout);report();if(!dataReady){dataReady=true;controller?.start()}}
   });
   instance.on('sourcedataloading',e=>loadedTiles.record(e));
   instance.on('render',()=>{
    if(disposed||!instance)return;
    const sample=frameBudget.sample(performance.now(),!document.hidden&&instance.isMoving());
    if(sample){lastFrameP75=sample.p75;instance.setPixelRatio(sample.pixelRatio);report()}
   });
   instance.on('idle',()=>{
    if(disposed||!instance)return;
    // Query once, around the center, instead of traversing the whole viewport on every idle.
    if(!hasBuildings&&instance.getLayer('real-buildings')){
     const {width,height}=container.getBoundingClientRect();
     if(instance.queryRenderedFeatures([[width*.3,height*.3],[width*.7,height*.7]],{layers:['real-buildings']}).length){hasBuildings=true;firstBuildings=performance.now()-began;report()}
    }
   });
   instance.on('error',e=>{if(disposed)return;if((e as {sourceId?:string}).sourceId==='imagery'&&!hasImagery)setStatus('error');report()});
   instance.on('webglcontextlost',()=>{if(disposed)return;controller?.pause('manual');setStatus('webgl')});
   if(initial.focusRequest){const event=events.find(e=>e.id===initial.focusRequest?.eventId);if(event)controller.focus(event,{allowUI:initial.focusRequest.allowWhileDialog})}
   // Commands issued through the city menu use the same single camera owner.
   commandHandler.current=action=>{
    controller?.pause('manual');scheduleRecovery();
    const duration=media.matches?0:450;
    if(action==='center')instance?.easeTo({center:BERLIN_CENTER,zoom:15,pitch:profile.pitch,bearing:0,duration});
    if(action==='zoom-in')instance?.zoomIn({duration});if(action==='zoom-out')instance?.zoomOut({duration});
   };
  }catch{if(!disposed)setStatus('webgl')}
  return()=>{disposed=true;facadeGeneration++;facades?.destroy();clearTimeout(timeout);if(recovery)clearTimeout(recovery);recoverHandler.current=()=>{};trafficRef.current=null;controller?.destroy();prefetch.destroy();tour.current=null;commandHandler.current=null;label?.remove();container.removeEventListener('pointerdown',pointerStart);container.removeEventListener('wheel',manual);container.removeEventListener('keydown',manual);window.removeEventListener('pointerup',pointerEnd);window.removeEventListener('pointercancel',pointerEnd);document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',motion);pins.current=[];highlight.current=()=>{};instance?.remove();map.current=null};
 },[retry]);
 useEffect(()=>{if(command)commandHandler.current?.(command.action)},[command]);
 useEffect(()=>{
  const controller=tour.current;if(!controller)return;
  const states=[['typing',typing],['ui',blocked],['panel',panelOpen]] as const;
  // Apply all new blockers before releasing old ones; a blur + menu-open
  // transition must never briefly restart the camera between effects.
  for(const [reason,paused] of states)if(paused)controller.pause(reason);
  if(searching)controller.pause('request');
  for(const [reason,paused] of states)if(!paused)controller.release(reason);
  trafficRef.current?.setActive(!document.hidden&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&!typing&&!blocked&&!panelOpen);recoverHandler.current();
 },[typing,blocked,panelOpen,searching]);
 useEffect(()=>{if(!focusRequest)return;const e=events.find(e=>e.id===focusRequest.eventId);if(e)tour.current?.focus(e,{allowUI:focusRequest.allowWhileDialog})},[focusRequest]);
 useEffect(()=>{pins.current.forEach(p=>p.el.classList.toggle('pin-muted',activeIds!==null&&!activeIds.includes(p.id)))},[activeIds]);
 return <><div ref={host} className="city-map" aria-label="Interaktive Berlin-Karte mit Luftbildern und geografischen 3D-Gebäuden"/>
 {status==='webgl'&&<div className="map-unavailable"><MapIcon size={28}/><h2>Karte nicht verfügbar</h2><p>Chat und Demo-Events bleiben nutzbar.</p><div className="fallback-pins">{events.map(e=><button key={e.id} onClick={()=>onSelect(e)}>{e.name} ↗</button>)}</div></div>}
 {status==='error'&&<div className="imagery-notice imagery-error glass" role="status"><span>Luftbilder nicht erreichbar.</span><button aria-label="Kartendaten erneut laden" onClick={()=>{setStatus('loading');setRetry(r=>r+1)}}><RotateCcw size={16}/></button></div>}
 <div className="map-credit">{!config.maptiler&&<><a href="https://daten.berlin.de/datensaetze/digitale-farbige-orthophotos-2025-dop20rgbi-wms-6529de5a" target="_blank" rel="noopener noreferrer">Geoportal Berlin</a> · </>}<a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OSM</a></div>
 {config.maptiler&&<a className="maptiler-logo" href="https://www.maptiler.com/" target="_blank" rel="noopener noreferrer">MapTiler</a>}
 </>;
}
