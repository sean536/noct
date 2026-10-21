'use client';
import {Heart} from 'lucide-react';
import {priceLabel,dateLabel,type NightEvent} from '@/lib/events';
import Poster from './Poster';

export default function EventCard({event,saved,onOpen,onSave}:{event:NightEvent;saved:boolean;onOpen:(event:NightEvent)=>void;onSave:(id:string)=>void}){
 return <article className="card" aria-label={`Demo-Event ${event.name}`}>
  <button className="card-open" aria-label={`${event.name}: Event ansehen`} onClick={()=>onOpen(event)}>
   <Poster event={event}/><span className="card-body"><strong className="card-title">{event.name}</strong>
    <span className="sub">{event.venue} · {event.district}</span>
    <span className="sub">{dateLabel(event.date)} · {event.time} Uhr</span>
    <span className="meta"><span>{priceLabel(event.price)}</span><span className="tag">{event.genre}</span><span className="tag">Demo</span></span>
   </span>
  </button>
  <button className="heart" aria-label={`${event.name} ${saved?'entfernen':'merken'}`} aria-pressed={saved} onClick={()=>onSave(event.id)}><Heart size={21} fill={saved?'currentColor':'none'}/></button>
 </article>;
}
