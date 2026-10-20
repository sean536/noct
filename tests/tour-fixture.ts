import {EventTour} from '../lib/tour';
export function setup(){let now=0,id=0,stops=0;const flights:{id:string;intro:boolean;arrive:()=>void}[]=[],labels:(string|null)[]=[],tasks=new Map<number,{at:number;fn:()=>void}>();
 const tour=new EventTour([{id:'bar',coords:[13.4,52.5]},{id:'club',coords:[13.44,52.51]}],{now:()=>now,fly:(stop,intro,arrive)=>flights.push({id:stop.id,intro,arrive}),stop:()=>{stops++},highlight:e=>labels.push(e?.id??null),later:(fn,ms)=>{tasks.set(++id,{at:now+ms,fn});return id},cancel:key=>{tasks.delete(key as number)}});
 const advance=(ms:number)=>{const target=now+ms;let guard=0;while(true){const next=[...tasks.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>target)break;if(++guard>100)throw Error('Timer loop');tasks.delete(next[0]);now=next[1].at;next[1].fn()}now=target};
 return {tour,flights,labels,tasks,advance,arrive:()=>flights.at(-1)?.arrive(),tick:()=>advance(2000),get stops(){return stops},late:(ms:number)=>{now+=ms;const next=[...tasks.entries()][0];if(next){tasks.delete(next[0]);next[1].fn()}},get now(){return now}};
}
