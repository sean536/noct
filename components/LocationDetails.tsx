'use client';
import {X} from 'lucide-react';
import type {VenueLocation} from '@/lib/locations';
import {NO_EVENTS,type NightEvent} from '@/lib/events';
import NoctSheet from './NoctSheet';
import Poster from './Poster';
import EventCard from './EventCard';
export default function LocationDetails({location,events,saved,onSave,onEvent,onClose}:{location:VenueLocation;events:NightEvent[];saved:string[];onSave:(id:string)=>void;onEvent:(event:NightEvent)=>void;onClose:()=>void}){
 const id=`location:${location.id}`;
 return <NoctSheet id="location-detail" title="Locationdetails" variant="tall" modal heading={false} onClose={onClose} footer={<div className="actions"><button className="btn sec" aria-pressed={saved.includes(id)} onClick={()=>onSave(id)}>{saved.includes(id)?'Gemerkt · Entfernen':'Merken'}</button><a className="btn main" href={location.website} target="_blank" rel="noopener noreferrer">Offizielle Website ↗</a></div>}>
  <div className="hero-art"><Poster event={{venue:location.name}} large/><span className="demo">Location</span><button className="x" aria-label="Locationdetails schließen" onClick={onClose}><X size={15}/></button></div>
  <div className="scroll detail-scroll"><div className="d-body"><h2>{location.name}</h2><p>{location.address}</p><p>Eine Location ist keine Veranstaltungs- oder Öffnungszusage.</p><p className="detail-address"><a href={location.coordinateSource} target="_blank" rel="noopener noreferrer">Ort auf OpenStreetMap ↗</a></p><h3>Verifizierte Veranstaltungen</h3>{events.length?events.map(event=><EventCard key={event.id} event={event} saved={saved.includes(event.id)} onSave={onSave} onOpen={onEvent}/>):<p>{NO_EVENTS}</p>}</div></div>
 </NoctSheet>;
}
