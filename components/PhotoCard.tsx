'use client';
import {Heart} from 'lucide-react';
import {useState,type ReactNode} from 'react';
import {locationImageFor} from '@/lib/location-images';
export default function PhotoCard({title,venue,kind,saved,onOpen,onSave,children}:{title:string;venue:string;kind:'Location'|'Veranstaltung';saved:boolean;onOpen:()=>void;onSave:()=>void;children:ReactNode}){
 const [failedSource,setFailedSource]=useState<string|null>(null),candidate=locationImageFor(venue);
 const photo=candidate?.src!==failedSource?candidate:undefined;
 return <article className={`card${photo?' photo-card':''}`} aria-label={`${kind} ${title}`}>
  <button className="card-open" aria-label={`${title}: ${kind==='Location'?'Location':'Event'} ansehen`} onClick={onOpen}>
   {photo?<><img className="club-photo" src={photo.src} srcSet={photo.srcSet} sizes={photo.sizes} width={photo.width} height={photo.height} style={{objectPosition:photo.position}} alt={photo.alt} loading="lazy" decoding="async" onError={()=>setFailedSource(photo.src)}/><span className="photo-status">{kind}</span></>:<div className="art" aria-label={`Kein Foto für ${venue} verfügbar`} role="img"/>}
   <span className="card-body">{(photo||title!==venue)&&<span className="photo-venue">{venue}</span>}{(!photo||title!==venue)&&<strong className="card-title">{title}</strong>}{children}</span>
  </button>
  <button className="heart" aria-label={`${title} ${saved?'entfernen':'merken'}`} aria-pressed={saved} onClick={onSave}><Heart size={21} fill={saved?'currentColor':'none'}/></button>
 </article>;
}
