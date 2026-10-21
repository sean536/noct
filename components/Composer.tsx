'use client';
import {ArrowUp} from 'lucide-react';

export default function Composer({id,value,onChange,onSend,onTyping,busy,home=false}:{
 id:string;value:string;onChange:(value:string)=>void;onSend:(text:string)=>void;
 onTyping:(typing:boolean)=>void;busy:boolean;home?:boolean;
}){
 return <form className="composer glass" autoComplete="off" onSubmit={event=>{event.preventDefault();onSend(value);}}>
  <label className="sr-only" htmlFor={id}>{home?'Frag NOCT':'Nachricht'}</label>
  <input id={id} placeholder={home?'Frag NOCT …':'Nachricht …'} value={value} onChange={event=>onChange(event.target.value)} maxLength={500} enterKeyHint="send" onFocus={()=>onTyping(true)} onBlur={()=>onTyping(false)}/>
  <button className="send" aria-label="Nachricht senden" type="submit" disabled={busy||!value.trim()}><ArrowUp size={18}/></button>
 </form>;
}
