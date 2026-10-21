'use client';
import dynamic from 'next/dynamic';
import {useState,useEffect,useRef,useCallback,useMemo} from 'react';
import {Map as MapIcon,MessageSquare,Heart,ChevronDown,Check,SlidersHorizontal,Plus,Minus,LocateFixed,Info,RotateCcw,X} from 'lucide-react';
import {NO_EVENTS,isCurrentEvent,type NightEvent} from '@/lib/events';
import {locations,type VenueLocation} from '@/lib/locations';
import {useVerifiedEvents} from '@/lib/use-events';
import {recommend,type Preferences} from '@/lib/chat';
import {matchesFilters,primaryGenres,type DiscoveryGenre} from '@/lib/event-filters';
import type {FocusRequest,MapCommand} from '@/components/CityMap';
import Composer from '@/components/Composer';
import NoctSheet from '@/components/NoctSheet';
import EventCard from '@/components/EventCard';
import EventDetails from '@/components/EventDetails';
import LocationCard from '@/components/LocationCard';
import LocationDetails from '@/components/LocationDetails';

const CityMap=dynamic(()=>import('@/components/CityMap'),{ssr:false,loading:()=> <div className="city-map map-loading"/>});
type Panel='chat'|'saved'|'filter'|null;
type Message={role:'user'|'assistant';text:string;eventIds?:string[];locationIds?:string[]};
const allGenres=[...primaryGenres,{label:'Hip-Hop',value:'Hip-Hop' as const},{label:'Dates',value:'Dates' as const}];

export default function Home(){
 const {events,status:eventStatus}=useVerifiedEvents();
 const latestEvents=useRef(events);latestEvents.current=events;
 const [selectedLocation,setSelectedLocation]=useState<VenueLocation|null>(null);
 const [input,setInput]=useState(''),[messages,setMessages]=useState<Message[]>([]),[preferences,setPreferences]=useState<Preferences>({});
 const [panel,setPanel]=useState<Panel>(null),[selected,setSelected]=useState<NightEvent|null>(null),[saved,setSaved]=useState<string[]>([]),[hydrated,setHydrated]=useState(false);
 const [cityMenu,setCityMenu]=useState(false),[about,setAbout]=useState(false),[busy,setBusy]=useState(false),[typing,setTyping]=useState(false),[notice,setNotice]=useState('');
 const [focusRequest,setFocusRequest]=useState<FocusRequest|null>(null),[mapCommand,setMapCommand]=useState<MapCommand|null>(null),[mapDiagnostics,setMapDiagnostics]=useState('Kartenverbindung wird aufgebaut.');
 const commandId=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),requestBusy=useRef(false),history=useRef<HTMLDivElement>(null),latestPreferences=useRef(preferences);
 latestPreferences.current=preferences;
 const modalOpen=!!selected||!!selectedLocation||about||panel==='filter';
 const filtered=useMemo(()=>events.filter(event=>matchesFilters(event,preferences)),[preferences]);
 const lastResponse=messages.findLast(message=>message.role==='assistant');
 const recommendedIds=lastResponse?.eventIds;
 const activeIds=useMemo(()=>{
  if(panel==='saved')return [...filtered.filter(event=>saved.includes(event.id)).map(event=>event.id),...saved.filter(id=>id.startsWith('location:'))];
  if(panel==='chat'&&recommendedIds)return [...filtered.filter(event=>recommendedIds.includes(event.id)).map(event=>event.id),...(lastResponse?.locationIds||[]).map(id=>`location:${id}`)];
  return Object.keys(preferences).length?filtered.map(event=>event.id):null;
 },[panel,filtered,saved,recommendedIds,preferences,lastResponse?.locationIds]);
 const filterCount=Number(!!preferences.genre)+Number(preferences.budget!==undefined)+Number(!!preferences.district)+Number(!!preferences.fromDate);
 const closePanel=useCallback(()=>{setPanel(null);setTyping(false);},[]);
 const closeDetail=useCallback(()=>setSelected(null),[]),closeAbout=useCallback(()=>setAbout(false),[]);

 useEffect(()=>{
  const viewport=window.visualViewport;
  const update=()=>{
   const height=viewport?.height||window.innerHeight;
   document.documentElement.style.setProperty('--app-height',`${height}px`);
   document.documentElement.style.setProperty('--viewport-top',`${viewport?.offsetTop||0}px`);
   document.documentElement.classList.toggle('keyboard-open',window.innerHeight-height>130&&document.activeElement instanceof HTMLInputElement);
  };
  update();viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update);document.addEventListener('focusin',update);document.addEventListener('focusout',update);
  return()=>{viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);document.removeEventListener('focusin',update);document.removeEventListener('focusout',update);document.documentElement.classList.remove('keyboard-open');document.documentElement.style.removeProperty('--app-height');document.documentElement.style.removeProperty('--viewport-top');};
 },[]);
 useEffect(()=>{
  try{const value:unknown=JSON.parse(localStorage.getItem('noct-saved')||'[]');if(Array.isArray(value))setSaved(value.filter((id):id is string=>typeof id==='string'&&(locations.some(location=>`location:${location.id}`===id)||/^event:[a-z0-9-]+:[a-f0-9]{24}$/.test(id))));}catch{}
  setHydrated(true);return()=>{if(timer.current)clearTimeout(timer.current);};
 },[]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem('noct-saved',JSON.stringify(saved));}catch{setNotice('Speichern ist nur für diese Sitzung möglich.');}},[saved,hydrated]);
 useEffect(()=>{if(eventStatus==='loading')return;setSaved(current=>{const next=current.filter(id=>locations.some(location=>`location:${location.id}`===id)||events.some(event=>event.id===id));return next.length===current.length?current:next;});setSelected(current=>current&&events.some(event=>event.id===current.id)?current:null);},[eventStatus,events]);
 useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),2400);return()=>clearTimeout(id);},[notice]);
 useEffect(()=>{history.current?.scrollTo({top:history.current.scrollHeight,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[messages,busy,panel,preferences]);
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setCityMenu(false);};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[]);

 const toggleSave=(id:string)=>{setSaved(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);setNotice(saved.includes(id)?'Entfernt':'Gemerkt');};
 const send=(text:string)=>{
  const clean=text.trim().slice(0,500);if(!clean||requestBusy.current)return;
  requestBusy.current=true;setInput('');setPanel('chat');setCityMenu(false);setBusy(true);setMessages(old=>[...old,{role:'user',text:clean}]);
  timer.current=setTimeout(()=>{
   const response=recommend(clean,latestPreferences.current,latestEvents.current);
   setPreferences(response.preferences);setMessages(old=>[...old,{role:'assistant',text:response.text,eventIds:response.events.map(event=>event.id)}]);
   if(response.events[0])setFocusRequest({id:++commandId.current,eventId:response.events[0].id});
   requestBusy.current=false;timer.current=null;setBusy(false);
  },450);
 };
 const resetChat=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;requestBusy.current=false;setBusy(false);setMessages([]);setPreferences({});setInput('');};
 const selectEvent=(event:NightEvent)=>{if(!isCurrentEvent(event)||!events.some(item=>item.id===event.id)){setNotice(NO_EVENTS);return;}setSelectedLocation(null);setFocusRequest({id:++commandId.current,eventId:event.id,allowWhileDialog:true});setSelected(event);setCityMenu(false);};
 const selectLocation=(location:VenueLocation)=>{setSelected(null);setSelectedLocation(location);setFocusRequest({id:++commandId.current,locationId:location.id,allowWhileDialog:true});setCityMenu(false);};
 const explore=()=>{setPreferences({});setMessages(old=>[...old,{role:'assistant',text:events.length?'Verifizierte Veranstaltungen und reale Locations. Eine Location ist keine Eventzusage.':NO_EVENTS,eventIds:events.map(event=>event.id),locationIds:locations.map(location=>location.id)}]);setPanel('chat');setCityMenu(false);};
 const issueMapCommand=(action:MapCommand['action'])=>{setMapCommand({id:++commandId.current,action});setCityMenu(false);};
 const navigate=(next:Panel)=>{setPanel(next);setSelected(null);setSelectedLocation(null);setAbout(false);setCityMenu(false);setTyping(false);};
 const setGenre=(genre:DiscoveryGenre|undefined)=>setPreferences(current=>{const next={...current};if(genre)next.genre=genre;else delete next.genre;return next;});
 const setBudget=(budget:number|undefined)=>setPreferences(current=>{const next={...current};if(budget!==undefined)next.budget=budget;else delete next.budget;return next;});
 const renderCard=(event:NightEvent)=><EventCard key={event.id} event={event} saved={saved.includes(event.id)} onSave={toggleSave} onOpen={selectEvent}/>;
 const renderLocation=(location:VenueLocation)=><LocationCard key={location.id} location={location} saved={saved.includes(`location:${location.id}`)} onSave={toggleSave} onOpen={selectLocation}/>;

 return <main className="app-shell">
  <div className="map-stage" inert={modalOpen||undefined}><CityMap eventData={events} onLocationSelect={selectLocation} onSelect={selectEvent} activeIds={activeIds} typing={typing} blocked={modalOpen||cityMenu} panelOpen={!!panel} searching={busy} focusRequest={focusRequest} command={mapCommand} onDiagnostics={setMapDiagnostics}/></div>
  <div className={`viewport-ui ${panel?'has-panel':''}`}>
   <div className="ui" inert={modalOpen||undefined}>
    <header className="noct-header">
     <button className="pill glass" id="cityBtn" aria-label="Stadt auswählen, Berlin" aria-expanded={cityMenu} aria-controls="cities" onClick={()=>setCityMenu(value=>!value)}><span className="logo">NOCT</span><span className="city-divider" aria-hidden="true">|</span><span>Berlin</span><ChevronDown size={12}/></button>
     <button className="pill glass" id="filterBtn" aria-label="Filter öffnen" onClick={()=>{setCityMenu(false);setPanel('filter');}}><SlidersHorizontal size={16}/>{filterCount>0&&<span className="badge">{filterCount}</span>}</button>
    </header>
    <section className={`hero ${panel==='chat'||!!selected||!!selectedLocation||about?'away':''}`} aria-label="Deinen Abend entdecken" inert={panel==='chat'||!!selected||!!selectedLocation||about||undefined}>
     <h1>Worauf hast du heute Lust?</h1>
     <Composer id="homeInput" home value={input} onChange={setInput} onSend={send} onTyping={setTyping} busy={busy}/>
     <div className="chips" aria-label="Schnellvorschläge">{primaryGenres.map(genre=><button className="chip" key={genre.value} aria-pressed={preferences.genre===genre.value} onClick={()=>send(genre.label)} disabled={busy}>{genre.label}</button>)}</div>
    </section>
    <nav className="tabbar glass" aria-label="Hauptnavigation">
     <button className="tab" aria-label="Karte" aria-pressed={!panel} onClick={()=>navigate(null)}><MapIcon size={22}/></button>
     <button className="tab" aria-label="Chat" aria-pressed={panel==='chat'} onClick={()=>navigate('chat')}><MessageSquare size={22}/></button>
     <button className="tab" aria-label="Gemerkt" aria-pressed={panel==='saved'} onClick={()=>navigate('saved')} aria-describedby={saved.length?'saved-count':undefined}><Heart size={22}/>{saved.length>0&&<><span className="badge" aria-hidden="true"/><span className="sr-only" id="saved-count">{saved.length} gemerkte Events</span></>}</button>
    </nav>
   </div>
   {cityMenu&&<><button className="city-dismiss" aria-label="Stadtmenü schließen" onClick={()=>setCityMenu(false)}/><section id="cities" className="cities glass open" aria-label="Stadt und Optionen">
    <div role="group" aria-label="Städte"><button aria-pressed onClick={()=>issueMapCommand('center')}>Berlin <Check size={15}/></button>{['Hamburg','London'].map(city=><button disabled key={city}>{city}<span>Demnächst</span></button>)}</div>
    <hr/><button onClick={explore}>Events entdecken <MapIcon size={15}/></button><button onClick={()=>{setAbout(true);setCityMenu(false);}}>Über NOCT <Info size={15}/></button>
    <div className="city-zoom" role="group" aria-label="Kartenzoom"><button aria-label="Karte vergrößern" onClick={()=>issueMapCommand('zoom-in')}><Plus size={17}/></button><button aria-label="Karte verkleinern" onClick={()=>issueMapCommand('zoom-out')}><Minus size={17}/></button><button aria-label="Berlin zentrieren" onClick={()=>issueMapCommand('center')}><LocateFixed size={17}/></button></div>
    <p className="map-diagnostics" role="status">{mapDiagnostics}</p>
   </section></>}
   {modalOpen&&<div className="scrim on" aria-hidden="true" onClick={()=>{if(selected)closeDetail();else if(selectedLocation)setSelectedLocation(null);else if(about)closeAbout();else closePanel();}}/>}
   {panel==='chat'&&<div inert={modalOpen||undefined} className="panel-host"><NoctSheet id="chat" title="Concierge" onClose={closePanel} tools={<><span className="chat-kind">Lokaler Concierge</span><button className="x" aria-label="Chat zurücksetzen" onClick={resetChat}><RotateCcw size={14}/></button></>} footer={<div className="chat-foot"><Composer id="chatInput" value={input} onChange={setInput} onSend={send} onTyping={setTyping} busy={busy}/></div>}>
    <div className="scroll" ref={history} role="log" aria-live="polite" aria-label="Chatverlauf">
     {!messages.length&&<><div className="msg ai">{events.length?'Nenne Musikrichtung, Bezirk oder Budget. Ich suche in verifizierten Veranstaltungen.':NO_EVENTS}</div><button className="browse-events" onClick={explore}>Locations und Events entdecken</button></>}
     {messages.map((message,index)=>{const matches=message.eventIds?events.filter(event=>message.eventIds!.includes(event.id)&&matchesFilters(event,preferences)):[];const text=message.role==='assistant'&&message.eventIds&&!matches.length?NO_EVENTS:message.text;return <div className="message-group" key={index}><div className={`msg ${message.role==='user'?'me':'ai'}`}>{text}</div>{message.eventIds&&<div className="recommendations" aria-label="Verifizierte Empfehlungen">{matches.map(renderCard)}</div>}{message.locationIds&&<section aria-label="Reale Locations"><p className="msg ai">Locations · unabhängig vom Eventprogramm</p>{locations.filter(location=>message.locationIds!.includes(location.id)).map(renderLocation)}</section>}</div>;})}
     {busy&&<div className="msg ai typing" role="status" aria-label="NOCT sucht Demo-Empfehlungen"><i/><i/><i/></div>}
    </div>
   </NoctSheet></div>}
   {panel==='saved'&&<div inert={modalOpen||undefined} className="panel-host"><NoctSheet id="saved" title="Gemerkt" onClose={closePanel}><div className="scroll">{filtered.filter(event=>saved.includes(event.id)).map(renderCard)}{locations.filter(location=>saved.includes(`location:${location.id}`)).map(renderLocation)}{!filtered.some(event=>saved.includes(event.id))&&!locations.some(location=>saved.includes(`location:${location.id}`))&&<div className="empty">{saved.length?'Keine gemerkten Einträge passen zum aktuellen Filter.':'Noch nichts gemerkt.'}<br/><button onClick={explore}>Locations und Events entdecken</button></div>}</div></NoctSheet></div>}
   {panel==='filter'&&!selected&&!selectedLocation&&!about&&<NoctSheet id="filter" title="Filter" variant="short" modal returnFocusId="filterBtn" onClose={closePanel} footer={<div className="actions"><button className="btn sec" onClick={()=>setPreferences({})}>Zurücksetzen</button><button className="btn main" onClick={closePanel}>Fertig</button></div>}>
    <div className="scroll"><fieldset className="group"><legend>Musikrichtung</legend><div className="row"><button className="chip" aria-pressed={!preferences.genre} onClick={()=>setGenre(undefined)}>Alle</button>{allGenres.map(genre=><button className="chip" key={genre.value} aria-pressed={preferences.genre===genre.value} onClick={()=>setGenre(genre.value)}>{genre.label}</button>)}</div></fieldset>
     <fieldset className="group"><legend>Eintritt</legend><div className="row"><button className="chip" aria-pressed={preferences.budget===undefined} onClick={()=>setBudget(undefined)}>Alle</button><button className="chip" aria-pressed={preferences.budget===0} onClick={()=>setBudget(0)}>Frei</button><button className="chip" aria-pressed={preferences.budget===15} onClick={()=>setBudget(15)}>Bis 15 €</button>{preferences.budget!==undefined&&![0,15].includes(preferences.budget)&&<button className="chip" aria-pressed title="Budgetfilter entfernen" onClick={()=>setBudget(undefined)}>Bis {preferences.budget} €</button>}</div></fieldset>
     {preferences.fromDate&&<fieldset className="group"><legend>Zeitraum</legend><button className="chip" onClick={()=>setPreferences(current=>{const next={...current};delete next.fromDate;delete next.toDate;return next;})}>{preferences.fromDate}{preferences.toDate!==preferences.fromDate?` – ${preferences.toDate}`:''} · Entfernen</button></fieldset>}
     {preferences.district&&<fieldset className="group"><legend>Bezirk aus deinem Chat</legend><button className="chip" onClick={()=>setPreferences(current=>{const next={...current};delete next.district;return next;})}>{preferences.district} · Entfernen</button></fieldset>}
     <p className="filter-result" role="status">{filtered.length} passende verifizierte Events</p>
    </div>
   </NoctSheet>}
   {selected&&<EventDetails event={selected} saved={saved.includes(selected.id)} onSave={toggleSave} onClose={closeDetail}/>}
   {selectedLocation&&<LocationDetails location={selectedLocation} events={events.filter(event=>event.locationId===selectedLocation.id)} saved={saved} onSave={toggleSave} onEvent={selectEvent} onClose={()=>setSelectedLocation(null)}/>}
   {about&&<NoctSheet id="about" title="Über NOCT" variant="tall" modal onClose={closeAbout}><div className="scroll about-body"><span className="logo">NOCT</span><h2>Deine Stadt. Deine Nacht.</h2><p>Der Chat antwortet lokal mit Regeln, ohne KI-API. Es werden keine Nachrichten an einen KI-Anbieter gesendet.</p><p>NOCT zeigt ausschließlich quellengeprüfte Veranstaltungen. Fehlende Preise oder Musikrichtungen werden nicht geschätzt. Veraltete oder nicht erreichbare Daten liefern keine Ersatzveranstaltungen. Quellen und Prüfzeit stehen in den Details. Die tägliche Quellenaktualisierung ist vorbereitet, noch nicht aktiv. Kein Ticketverkauf durch NOCT.</p><p>Luftbilder: Geoportal Berlin. Gebäudegrundrisse: OpenStreetMap über OpenFreeMap. Prozedurale Fassaden, Dächer und Fensterbeleuchtung sind gestalterische Simulationen, keine echten Fassadenaufnahmen. Bei fehlenden 3D-Daten bleiben Luftbilder und Event-Pins bedienbar.</p><p>Die bestehende Tour pausiert bei Karteninteraktion, Texteingabe und geöffneten Panels. Die Merkliste bleibt auf diesem Gerät gespeichert. Hamburg und London sind noch nicht verfügbar.</p></div></NoctSheet>}
   {notice&&<div className="toast glass on" role="status">{notice}<button aria-label="Hinweis schließen" onClick={()=>setNotice('')}><X size={14}/></button></div>}
  </div>
 </main>;
}
