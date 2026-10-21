'use client';
import type {VenueLocation} from '@/lib/locations';
import PhotoCard from './PhotoCard';
export default function LocationCard({location,saved,onOpen,onSave}:{location:VenueLocation;saved:boolean;onOpen:(location:VenueLocation)=>void;onSave:(id:string)=>void}){
 return <PhotoCard kind="Location" title={location.name} venue={location.name} saved={saved} onOpen={()=>onOpen(location)} onSave={()=>onSave(`location:${location.id}`)}>
  <span className="sub">Berlin · {location.district}</span><span className="meta"><span>Location · keine Eventzusage</span></span>
 </PhotoCard>;
}
