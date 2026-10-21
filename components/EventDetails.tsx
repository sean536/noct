'use client';
import {X} from 'lucide-react';
import {priceLabel,dateLabel,type NightEvent} from '@/lib/events';
import NoctSheet from './NoctSheet';
import Poster from './Poster';
export default function EventDetails({event,saved,onSave,onClose}:{event:NightEvent;saved:boolean;onSave:(id:string)=>void;onClose:()=>void}){
 return <NoctSheet id="detail" title="Eventdetails" variant="tall" modal heading={false} onClose={onClose} footer={<div className="actions">
  <button className="btn sec" aria-pressed={saved} onClick={()=>onSave(event.id)}>{saved?'Gemerkt · Entfernen':'Merken'}</button>
  <a className="btn main" href={event.officialUrl} target="_blank" rel="noopener noreferrer">Offizielle Veranstaltung ↗</a>
 </div>}>
  <div className="hero-art"><Poster event={event} large/><span className="demo">Veranstaltung</span><button className="x" aria-label="Eventdetails schließen" onClick={onClose}><X size={15}/></button></div>
  <div className="scroll detail-scroll"><div className="d-body"><h2>{event.name}</h2><div className="detail-venue">{event.venue}, {event.district} · Berlin</div>
   <div className="row detail-tags">{(event.tags.length?event.tags:[event.genre||'Musik nicht bestätigt']).map(tag=><span className="tag" key={tag}>{tag}</span>)}</div>
   <div className="facts"><div className="fact"><small>Datum</small><b>{dateLabel(event.date)}</b></div><div className="fact"><small>Beginn</small><b>{event.time} Uhr</b></div><div className="fact"><small>Eintritt</small><b>{priceLabel(event.price)}</b></div><div className="fact"><small>Ort</small><b>{event.venue}</b></div></div>
   <p className="detail-address">Quelle: <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">Offizieller Clubkalender ↗</a></p>
   <p>Zuletzt geprüft: {new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(event.lastVerifiedAt))} Uhr (Berlin).</p><p>Programmänderungen sind möglich. Maßgeblich sind die Angaben des Veranstalters. Kein Ticketverkauf durch NOCT.</p>
  </div></div>
 </NoctSheet>;
}
