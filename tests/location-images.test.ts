import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import EventCard from '../components/EventCard';
import {events} from '../lib/events';
import {locationImages,locationImageFor} from '../lib/location-images';

test('supplied photos belong to four stable locations and are disabled outside the private demo',()=>{
 assert.deepEqual(locationImages.map(location=>[location.attachment,location.venue]),[
  [1,'808 Nachtklub'],[2,'BRICKS Club'],[3,'AMANO Rooftop Bar am Berliner Hauptbahnhof'],[4,'Weekend Club']
 ]);
 assert.equal(locationImageFor('Weekend Club',false),undefined);
 assert.equal(locationImageFor('Klunkerkranich',true),undefined);
 assert.equal(locationImageFor('Lido',true),undefined);
 assert.equal(locationImageFor(' AMANO Rooftop Bar Hauptbahnhof ',true)?.attachment,3);
 for(const location of locationImages){
  const photo=locationImageFor(location.venue,true)!;
  assert.equal(photo.id,location.id);
  assert.equal(photo.srcSet.split(', ').length,3);
  assert.match(photo.src,/^\/_private\/club-photos\//);
 }
 assert.deepEqual(events.filter(event=>locationImageFor(event.venue,true)).map(event=>event.id),['soft-sunset']);
});

test('ordinary build and venues without supplied photographs retain neutral cards and existing controls',()=>{
 const previous=process.env.NEXT_PUBLIC_NOCT_PRIVATE_LOCATION_IMAGES;
 delete process.env.NEXT_PUBLIC_NOCT_PRIVATE_LOCATION_IMAGES;
 try{
  for(const event of events){
   const html=renderToString(createElement(EventCard,{event,saved:true,onOpen:()=>{},onSave:()=>{}}));
   assert.ok(!html.includes('<img'));assert.ok(!html.includes('photo-card'));
   assert.ok(html.includes(event.name.replaceAll('&','&amp;')+': Event ansehen'));assert.ok(html.includes('aria-pressed="true"'));
  }
 }finally{
  if(previous!==undefined)process.env.NEXT_PUBLIC_NOCT_PRIVATE_LOCATION_IMAGES=previous;
 }
});

test('private Weekend card uses the supplied venue photograph and never confirms a demo admission',()=>{
 const previous=process.env.NEXT_PUBLIC_NOCT_PRIVATE_LOCATION_IMAGES;
 process.env.NEXT_PUBLIC_NOCT_PRIVATE_LOCATION_IMAGES='1';
 try{
  const event=events.find(event=>event.id==='soft-sunset')!;
  const html=renderToString(createElement(EventCard,{event,saved:false,onOpen:()=>{},onSave:()=>{}}));
  assert.match(html,/photo-card/);
  assert.match(html,/weekend-club-640\.webp/);
  assert.match(html,/Eintritt nicht bestätigt/);
  assert.ok(!html.includes('12 €'));
  assert.match(html,/Demo/);
 }finally{
  if(previous===undefined)delete process.env.NEXT_PUBLIC_NOCT_PRIVATE_LOCATION_IMAGES;else process.env.NEXT_PUBLIC_NOCT_PRIVATE_LOCATION_IMAGES=previous;
 }
});
