'use client';
import {Heart} from 'lucide-react';
import {useState} from 'react';
import {priceLabel,dateLabel,type NightEvent} from '@/lib/events';
import {locationImageFor} from '@/lib/location-images';
import Poster from './Poster';

export default function EventCard({event,saved,onOpen,onSave}:{event:NightEvent;saved:boolean;onOpen:(event:NightEvent)=>void;onSave:(id:string)=>void}){
 const [failedSource,setFailedSource]=useState<string|null>(null);
 const candidate=locationImageFor(event.venue);
 const photo=candidate?.src!==failedSource?candidate:undefined;
 return <article className={`card${photo?' photo-card':''}`} aria-label={`Demo-Event ${event.name}`}>
  <button className="card-open" aria-label={`${event.name}: Event ansehen`} onClick={()=>onOpen(event)}>
   {photo?<><img className="club-photo" src={photo.src} srcSet={photo.srcSet} sizes={photo.sizes} width={photo.width} height={photo.height} style={{objectPosition:photo.position}} alt={photo.alt} loading="lazy" decoding="async" onError={()=>setFailedSource(photo.src)}/><span className="photo-status">Demo-Event</span></>:<Poster event={event}/>}
   <span className="card-body">{photo&&<span className="photo-venue">{event.venue}</span>}<strong className="card-title">{event.name}</strong>
    {!photo&&<span className="sub">{event.venue} · {event.district}</span>}
    <span className="sub">{dateLabel(event.date)} · {event.time} Uhr</span>
    <span className="meta"><span>{photo?'Eintritt nicht bestätigt':priceLabel(event.price)}</span><span className="tag">{event.genre}</span>{!photo&&<span className="tag">Demo</span>}</span>
   </span>
  </button>
  <button className="heart" aria-label={`${event.name} ${saved?'entfernen':'merken'}`} aria-pressed={saved} onClick={()=>onSave(event.id)}><Heart size={21} fill={saved?'currentColor':'none'}/></button>
 </article>;
}
