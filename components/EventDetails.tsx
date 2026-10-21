'use client';
import {X} from 'lucide-react';
import {priceLabel,dateLabel,type NightEvent} from '@/lib/events';
import NoctSheet from './NoctSheet';
import Poster from './Poster';

export default function EventDetails({event,saved,onSave,onClose}:{event:NightEvent;saved:boolean;onSave:(id:string)=>void;onClose:()=>void}){
 const ticket=event.ticket.affiliateUrl||event.ticket.url;
 return <NoctSheet id="detail" title="Eventdetails" variant="tall" modal heading={false} onClose={onClose} footer={<div className="actions">
  <button className="btn sec" aria-pressed={saved} onClick={()=>onSave(event.id)}>{saved?'Gemerkt · Entfernen':'Merken'}</button>
  {ticket?<a className="btn main" href={ticket} target="_blank" rel="noopener noreferrer sponsored">Tickets ↗</a>:<button className="btn main" disabled aria-describedby="ticket-note">Keine Tickets · Demo</button>}
 </div>}>
  <div className="hero-art"><Poster event={event} large/><span className="demo">Demo-Daten</span><button className="x" aria-label="Eventdetails schließen" onClick={onClose}><X size={15}/></button></div>
  <div className="scroll detail-scroll"><div className="d-body"><h2>{event.name}</h2><div className="detail-venue">{event.venue}, {event.district} · Berlin</div>
   <div className="row detail-tags">{[event.genre,...event.tags].map(tag=><span className="tag" key={tag}>{tag}</span>)}</div>
   <div className="facts"><div className="fact"><small>Datum</small><b>{dateLabel(event.date)}</b></div><div className="fact"><small>Beginn</small><b>{event.time} Uhr</b></div><div className="fact"><small>Eintritt</small><b>{priceLabel(event.price)}</b></div><div className="fact"><small>Ort</small><b>{event.venue}</b></div></div>
   <p>{event.description}</p>{event.address&&<p className="detail-address">{event.address}{event.locationSource&&<> · <a href={event.locationSource} target="_blank" rel="noopener noreferrer">Ort auf OpenStreetMap ↗</a></>}</p>}
   {!ticket&&<p id="ticket-note" className="ticket-note">Demo ohne Ticketverkauf. Event, Datum, Zeiten und Preise sind fiktive Beispiele an einer realen Location. Kein bestätigtes Programm.</p>}
  </div></div>
 </NoctSheet>;
}
