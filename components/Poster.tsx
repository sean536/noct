'use client';
import type {NightEvent} from '@/lib/events';
import {locationImageFor} from '@/lib/location-images';
import {useState} from 'react';
export default function Poster({event,large=false}:{event:Pick<NightEvent,'venue'>;large?:boolean}){
 const photo=locationImageFor(event.venue),[failed,setFailed]=useState(false);
 if(photo&&!failed)return <img className={`art${large?' poster-large':''}`} src={photo.src} srcSet={photo.srcSet} sizes={photo.sizes} width={photo.width} height={photo.height} alt={photo.alt} style={{objectFit:'cover',objectPosition:photo.position}} onError={()=>setFailed(true)}/>;
 return <div className={`art${large?' poster-large':''}`} aria-label={`Kein Foto für ${event.venue} verfügbar`} role="img"/>;
}
