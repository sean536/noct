'use client';
import {useState} from 'react';
import type {VenueLocation} from '@/lib/locations';
import {dateLabel,type NightEvent} from '@/lib/events';
import {locationImageFor} from '@/lib/location-images';
/** Full cover width for the existing supplied images at this compact map-card aspect ratio. */
export const focusPhotoSizes=(photo:{width:number;height:number})=>`${Math.ceil(220*Math.max(1,photo.width/photo.height/(220/168)))}px`;
export default function MapFocusCard({location,event,onOpen}:{location:VenueLocation;event?:NightEvent;onOpen:()=>void}){
 const candidate=locationImageFor(location.name),[failedSource,setFailedSource]=useState<string|null>(null),photo=candidate?.src!==failedSource?candidate:undefined;
 const title=event?.name||location.name;
 return <button type="button" className={`event-map-label ${photo?'photo-focus':'neutral-focus'}`} aria-label={`${event?'Veranstaltung':'Location'} ${title}. Details ansehen`} onClick={onOpen}>
  {photo&&<img key={photo.id} className="focus-photo" src={photo.src} srcSet={photo.srcSet} sizes={focusPhotoSizes(photo)} width={photo.width} height={photo.height} alt={photo.alt} style={{objectPosition:photo.position}} decoding="async" onError={()=>setFailedSource(photo.src)}/>}
  {photo&&<span className="focus-shade" aria-hidden="true"/>}
  <span className="focus-content"><small>{event?'VERANSTALTUNG':'LOCATION'}</small><strong>{title}</strong><span className="focus-place">{event?location.name:location.district}</span><span className="label-time">{event?`${dateLabel(event.date)} · ${event.time} Uhr`:location.address}</span></span>
 </button>;
}
