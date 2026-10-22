import {test} from 'node:test';import assert from 'node:assert/strict';import {icalEvents,weekendCalendarLinks} from '../lib/event-ical';import {refreshSources} from '../lib/event-ingestion';import {TEST_NOW} from './event-fixture';import type {EventSource} from '../lib/event-sources';
const source:EventSource={locationId:'weekend-club',url:'https://www.weekendclub.berlin/upcoming/__test-only__?format=ical',scope:'owner-private',enabled:true,rightsReviewed:true};
const calendar=(overrides:string[]=[])=>(['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT','SUMMARY:TEST ONLY – official feed fixture','DTSTART:20300111T210000Z','DTEND:20300112T050000Z','URL:https://www.weekendclub.berlin/upcoming/__test-only__','LOCATION:Weekend Club\\, Alexanderstraße 7\\, Berlin',...overrides,'END:VEVENT','END:VCALENDAR',''].join('\r\n'));
test('ICS imports exact UTC times and known venue, folded text, no guessed price/genre',()=>{
 const result=icalEvents(calendar(),source,TEST_NOW);assert.equal(result.length,1);assert.equal(result[0].time,'22:00');assert.equal(result[0].price,null);assert.equal(result[0].genre,null);assert.equal(result[0].sourceUrl,source.url);
 const folded=calendar().replace('feed fixture','feed\r\n fixture');assert.equal(icalEvents(folded,source,TEST_NOW)[0].name,'TEST ONLY – official feedfixture');
});
test('ICS never guesses floating/all-day times, recurring instances, private or cancelled events',()=>{
 for(const extra of [['STATUS:CANCELLED'],['CLASS:PRIVATE'],['RRULE:FREQ=WEEKLY'],['RECURRENCE-ID:20300111T210000Z'],['DTSTART:20300111T220000Z']])assert.equal(icalEvents(calendar(extra),source,TEST_NOW).length,0);
 for(const time of ['DTSTART:20300111T220000','DTSTART;VALUE=DATE:20300111','DTSTART;LOCAL=YES:20300111T220000Z'])assert.equal(icalEvents(calendar().replace('DTSTART:20300111T210000Z',time),source,TEST_NOW).length,0);
 for(const place of ['Another Club, Alexanderstraße 7, Berlin','Weekend Club, Another Street 7, Berlin'])assert.equal(icalEvents(calendar().replace('Weekend Club\\, Alexanderstraße 7\\, Berlin',place),source,TEST_NOW).length,0);
});
test('Berlin timezone uses actual DST and rejects ambiguous or nonexistent local hours',()=>{
 const replace=(value:string)=>calendar().replace('DTSTART:20300111T210000Z',value).replace('DTEND:20300112T050000Z','DTEND:20301101T050000Z');
 const summer=icalEvents(replace('DTSTART;TZID=Europe/Berlin:20300710T220000'),source,TEST_NOW);assert.equal(summer[0].startsAt,'2030-07-10T20:00:00.000Z');
 for(const time of ['20301027T023000','20300331T023000'])assert.equal(icalEvents(replace('DTSTART;TZID=Europe/Berlin:'+time),source,TEST_NOW).length,0);
});
test('ICS discovers only actual official event-feed links, with bounded deduplication',()=>{
 const html='<a href="/upcoming/__test-only__?format=ical">ICS</a><a href="https://elsewhere.invalid/?format=ical">bad</a><a href="/upcoming/__test-only__?format=ical">ICS</a><a href="/upcoming/another">HTML</a>';
 assert.deepEqual(weekendCalendarLinks(html,source),[source.url]);assert.deepEqual(weekendCalendarLinks(html,{...source,locationId:'amano-rooftop'}),[]);
});
test('refresh uses robots then official HTML then its linked ICS, no constructed API endpoint',async()=>{
 const calls:string[]=[];const s={...source,url:'https://www.weekendclub.berlin/upcoming'};
 const result=await refreshSources([s],TEST_NOW,async url=>{calls.push(String(url));return new Response(calls.length===1?'User-agent: *\nAllow: /':calls.length===2?'<a href="/upcoming/__test-only__?format=ical">ICS</a>':calendar());});
 assert.deepEqual(calls,[s.url.replace('/upcoming','/robots.txt'),s.url,source.url]);assert.equal(result.events.length,1);assert.equal(result.refresh.dailyActive,false);
});
test('conflicting timezone notation and calendar-level cancellation never publish',()=>{
 assert.deepEqual(icalEvents(calendar().replace('DTSTART:20300111T210000Z','DTSTART;TZID=Europe/Berlin:20300710T220000Z').replace('DTEND:20300112T050000Z','DTEND:20300711T050000Z'),source,TEST_NOW),[]);
 assert.deepEqual(icalEvents(calendar().replace('VERSION:2.0','VERSION:2.0\r\nMETHOD:CANCEL'),source,TEST_NOW),[]);
});

test('case-insensitive cancellation and private metadata cannot bypass import gates',()=>{
 assert.deepEqual(icalEvents(calendar().replace('VERSION:2.0','VERSION:2.0\r\nmethod:CANCEL'),source,TEST_NOW),[]);
 assert.deepEqual(icalEvents(calendar(['CLASS:private']),source,TEST_NOW),[]);
 assert.deepEqual(icalEvents(calendar(['class:PRIVATE']),source,TEST_NOW),[]);
});
