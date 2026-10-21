'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';

export default function NoctSheet({id,title,onClose,children,footer,variant='',modal=false,heading=true,tools,returnFocusId='cityBtn'}:{
 id:string;title:string;onClose:()=>void;children:ReactNode;footer?:ReactNode;
 variant?:''|'tall'|'short';modal?:boolean;heading?:boolean;tools?:ReactNode;returnFocusId?:string;
}){
 const ref=useRef<HTMLElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null,node=ref.current;
  node?.focus({preventScroll:true});
  const key=(event:KeyboardEvent)=>{
   if(node?.closest('[inert]'))return;
   if(event.key==='Escape'){event.preventDefault();close.current();return;}
   if(!modal||event.key!=='Tab'||!node)return;
   const items=Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
   const first=items[0],last=items[items.length-1];
   if(!first){event.preventDefault();return;}
   if(event.shiftKey&&(document.activeElement===first||document.activeElement===node)){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===node)){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',key);
  return()=>{
   document.removeEventListener('keydown',key);
   if(modal||node?.contains(document.activeElement))queueMicrotask(()=>{
    const target=previous?.isConnected&&previous!==document.body&&!previous.closest('[inert]')&&previous.getClientRects().length&&getComputedStyle(previous).visibility==='visible'?previous:document.getElementById(returnFocusId);
    target?.focus({preventScroll:true});
   });
  };
 },[modal,returnFocusId]);
 return <section ref={ref} id={id} className={`sheet glass open ${variant}`} role={modal?'dialog':'region'} aria-modal={modal||undefined} aria-label={title} tabIndex={-1}>
  {heading&&<><div className="grab"/><div className="sh-head"><h2>{title}</h2><div className="sheet-tools">{tools}<button className="x" aria-label={`${title} schließen`} onClick={onClose}><X size={15}/></button></div></div></>}
  {children}{footer}
 </section>;
}
