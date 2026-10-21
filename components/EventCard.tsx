'use client';
import {priceLabel,dateLabel,type NightEvent} from '@/lib/events';
import PhotoCard from './PhotoCard';
export default function EventCard({event,saved,onOpen,onSave}:{event:NightEvent;saved:boolean;onOpen:(event:NightEvent)=>void;onSave:(id:string)=>void}){
 return <PhotoCard kind="Veranstaltung" title={event.name} venue={event.venue} saved={saved} onOpen={()=>onOpen(event)} onSave={()=>onSave(event.id)}>
  <span className="sub">{dateLabel(event.date)} · {event.time} Uhr</span>
  <span className="meta"><span>{priceLabel(event.price)}</span>{event.genre&&<span className="tag">{event.genre}</span>}</span>
 </PhotoCard>;
}
