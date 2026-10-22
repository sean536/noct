import {test} from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {mkdtemp,readFile,symlink} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {structuredEvents,refreshSources,robotsAllowed,eventID} from '../lib/event-ingestion';import {eventSources,type EventSource} from '../lib/event-sources';import {TEST_NOW} from './event-fixture';
const source:EventSource={locationId:'weekend-club',url:'https://www.weekendclub.berlin/upcoming',enabled:true,rightsReviewed:true,scope:'owner-private'};
const base={ '@type':'MusicEvent',name:'TEST ONLY – structured source',startDate:'2030-01-11T22:00:00+01:00',url:'https://www.weekendclub.berlin/__test-only__',location:{'@type':'Place',url:'https://www.weekendclub.berlin/'}};
const html=(value:unknown)=>`<script type="application/ld+json">${JSON.stringify(value)}</script>`;
test('structured source requires explicit offset time, identity and official venue',()=>{
 const parsed=structuredEvents(html({'@graph':[base]}),source,TEST_NOW);assert.equal(parsed.length,1);assert.equal(parsed[0].price,null);assert.equal(parsed[0].genre,null);assert.equal(parsed[0].verification,'structured-source');
 for(const field of [{startDate:'2030-01-11'},{startDate:'2030-01-11T22:00:00'},{location:{name:'unverifiable venue'}},{url:'https://ticket.example/'},{eventStatus:'https://schema.org/EventCancelled'},{endDate:'bad'},{startDate:'2020-01-01T00:00:00Z'}])assert.equal(structuredEvents(html({...base,...field}),source,TEST_NOW).length,0,JSON.stringify(field));
});
test('structured optional facts are confirmed, never inferred from descriptions or multi-price offers',()=>{
 const a=structuredEvents(html({...base,description:'Free techno tonight €0'}),source,TEST_NOW)[0];assert.equal(a.price,null);assert.equal(a.genre,null);assert.deepEqual(a.tags,[]);
 const offer={price:'0',priceCurrency:'EUR',url:base.url};const b=structuredEvents(html({...base,genre:['House','Techno'],offers:offer,endDate:'2030-01-12T06:00:00+01:00'}),source,TEST_NOW)[0];assert.equal(b.price,0);assert.equal(b.genre,'House');assert.ok(b.confirmedFields.includes('endsAt'));
 for(const offers of [[offer,offer],{...offer,priceCurrency:'USD'},{...offer,price:'from 10'},{...offer,url:'https://elsewhere.invalid/'}])assert.equal(structuredEvents(html({...base,offers}),source,TEST_NOW)[0].price,null);
});
test('IDs are deterministic across equivalent timezone spellings and normalized names',()=>{assert.equal(eventID('weekend-club','  Test  Name ','2030-01-11T22:00:00+01:00'),eventID('weekend-club','test name','2030-01-11T21:00:00Z'));});
test('robots policy is conservative, scoped and honors specific disallow before fetching',()=>{
 assert.equal(robotsAllowed('User-agent: *\nDisallow: /upcoming','/upcoming'),false);assert.equal(robotsAllowed('User-agent: *\nDisallow: /\nAllow: /upcoming','/upcoming'),true);
 assert.equal(robotsAllowed('User-agent: *\nAllow: /\nUser-agent: NOCT-EventVerifier\nDisallow: /','/upcoming'),false);assert.equal(robotsAllowed('User-agent: *\nCrawl-delay: 30','/upcoming'),false);assert.equal(robotsAllowed('<html>Denied</html>','/upcoming'),false);
});
test('unapproved sources perform zero requests and cannot be activated by browser polling',async()=>{let calls=0;const result=await refreshSources(eventSources,TEST_NOW,async()=>{calls++;throw Error('Should not fetch');});assert.equal(calls,0);assert.equal(result.events.length,0);assert.equal(result.refresh.dailyActive,false);assert.ok(result.refresh.sources.every(s=>s.status==='disabled-pending-permission'));});
test('source refresh checks robots first and reports failures without stale replacement',async()=>{
 let calls:string[]=[];const fetcher:typeof fetch=async url=>{calls.push(String(url));return new Response(calls.length===1?'User-agent: *\nDisallow: /upcoming':html(base));};const denied=await refreshSources([source],TEST_NOW,fetcher);assert.equal(calls.length,1);assert.deepEqual(denied.events,[]);
 calls=[];const ok=await refreshSources([source],TEST_NOW,async url=>{calls.push(String(url));return new Response(calls.length===1?'User-agent: *\nAllow: /':html(base));});assert.equal(calls.length,2);assert.equal(ok.events.length,1);
 const failed=await refreshSources([source],TEST_NOW,async()=>{throw Error('network unavailable');});assert.deepEqual(failed.events,[]);assert.match(failed.refresh.sources[0].status,/unavailable/);
});
test('oversized or redirected sources fail closed',async()=>{
 const r=await refreshSources([source],TEST_NOW,async()=>new Response('body',{headers:{'content-length':'3000000'}}));assert.deepEqual(r.events,[]);assert.match(r.refresh.sources[0].status,/too large/);
 await refreshSources([source],TEST_NOW,async(_url,options)=>{assert.equal(options?.redirect,'error');assert.ok(options?.signal);throw Error('redirect blocked');});
});
test('CLI emits an external empty report and refuses output inside public checkout or symlink',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'noct-events-')),output=join(dir,'snapshot.json');const run=(path:string)=>spawnSync(process.execPath,['--import','tsx','scripts/refresh-events.ts','refresh',path],{cwd:process.cwd(),encoding:'utf8'});
 const good=run(output);assert.equal(good.status,0,good.stderr);assert.deepEqual(JSON.parse(await readFile(output,'utf8')).events,[]);
 assert.notEqual(run('public/unwanted-events.json').status,0);await symlink(join(process.cwd(),'public'),join(dir,'public-link'));assert.notEqual(run(join(dir,'public-link','unwanted-events.json')).status,0);
 await symlink(join(process.cwd(),'public/verified-events.json'),join(dir,'destination-link.json'));assert.notEqual(run(join(dir,'destination-link.json')).status,0);
});
test('same publisher domain does not establish the correct physical venue',()=>{
 const amano:EventSource={...source,locationId:'amano-rooftop',url:'https://www.amanogroup.com/de/bars/grand-central-rooftop-bar-berlin-hauptbahnhof'};
 const other={...base,url:'https://www.amanogroup.com/de/events/__test-only__',location:{name:'AMANO Bar Munich',url:'https://www.amanogroup.com/de/bars/amano-bar-munich'}};
 assert.deepEqual(structuredEvents(html(other),amano,TEST_NOW),[]);
 assert.equal(structuredEvents(html({...other,location:{url:amano.url}}),amano,TEST_NOW).length,1);
});
