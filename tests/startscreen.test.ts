import {test} from 'node:test';import assert from 'node:assert/strict';import {createElement} from 'react';import {renderToString} from 'react-dom/server';import Home from '../app/page';
test('approved start screen has one greeting/composer, five genre chips, header and navigation without fake map or open sheets',()=>{
 const html=renderToString(createElement(Home));
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.equal(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),'Worauf hast du heute Lust?');
 assert.equal((html.match(/<input\b/g)||[]).length,1);assert.match(html,/placeholder="Frag NOCT …"/);
 for(const chip of ['Afro','Techno','House','Rooftop','Bars'])assert.ok(html.includes('>'+chip+'</button>'));
 for(const label of ['Karte','Chat','Gemerkt','Filter öffnen'])assert.ok(html.includes('aria-label="'+label+'"'));
 assert.ok(html.includes('NOCT'));assert.ok(html.includes('Berlin'));assert.ok(!html.includes('map-slot'));assert.ok(!html.includes('<iframe'));assert.ok(!html.includes('class="sheet '));
});
