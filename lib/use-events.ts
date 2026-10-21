'use client';
import {useEffect,useMemo,useState} from 'react';
import {readEventSnapshot,isCurrentEvent,type NightEvent} from './events';
export function useVerifiedEvents(){
 const [snapshot,setSnapshot]=useState<NightEvent[]>([]),[now,setNow]=useState(()=>Date.now()),[status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading');
 useEffect(()=>{
  let disposed=false,request:AbortController|undefined,lastAttempt=0;
  const refresh=async()=>{
   if(disposed||document.hidden)return;
   lastAttempt=Date.now();request?.abort();const controller=new AbortController();request=controller;
   const timeout=setTimeout(()=>controller.abort(),10000);
   try{
    const response=await fetch('/verified-events.json',{cache:'no-store',redirect:'error',signal:controller.signal});
    if(!response.ok)throw Error('Event source unavailable');
    const text=await response.text();if(text.length>2_000_000)throw Error('Event source too large');
    const data=readEventSnapshot(JSON.parse(text),Date.now(),process.env.NEXT_PUBLIC_NOCT_PRIVATE_LOCATION_IMAGES==='1'?'owner-private':'public');
    if(!disposed&&request===controller){setSnapshot(data);setNow(Date.now());setStatus('ready');}
   }catch{if(!disposed&&request===controller){setSnapshot([]);setNow(Date.now());setStatus('unavailable');}}
   finally{clearTimeout(timeout);}
  };
  const tick=()=>{if(document.hidden)return;setNow(Date.now());if(Date.now()-lastAttempt>=15*60_000)void refresh();};
  void refresh();const timer=setInterval(tick,60_000);document.addEventListener('visibilitychange',tick);window.addEventListener('focus',tick);
  return()=>{disposed=true;request?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',tick);window.removeEventListener('focus',tick);};
 },[]);
 const events=useMemo(()=>snapshot.filter(event=>isCurrentEvent(event,now)),[snapshot,now]);
 return {events,now,status};
}
