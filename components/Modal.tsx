'use client';
import {useEffect,useRef,useId} from 'react';
import {X} from 'lucide-react';
export default function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
 const ref=useRef<HTMLDivElement>(null),id=useId();
 useEffect(()=>{const previous=document.activeElement as HTMLElement;const node=ref.current;node?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='Tab'&&node){const all=Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,[tabindex="0"]'));if(!all.length){e.preventDefault();return;}const first=all[0],last=all[all.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===node)){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===node)){e.preventDefault();first.focus()}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus()};},[onClose]);
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal glass" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} ref={ref}><div className="modal-bar"><span id={id}>{title}</span><button className="icon-button" aria-label="Detailansicht schließen" onClick={onClose}><X size={20}/></button></div>{children}</div></div>
}
