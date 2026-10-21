import type {NightEvent} from '@/lib/events';
export default function Poster({event,large=false}:{event:NightEvent;large?:boolean}){return <div className={`art art-${event.art} ${large?'poster-large':''}`} aria-label={`Illustratives Demo-Artwork für ${event.name}`} role="img"/>}
