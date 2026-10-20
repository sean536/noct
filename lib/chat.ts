import {events, type Genre, type NightEvent} from './events';
export interface Preferences {genre?:Genre;district?:string;budget?:number;}
export interface ChatResult {text:string;events:NightEvent[];preferences:Preferences;}
export function recommend(input:string,previous:Preferences={}):ChatResult {
 const q=input.toLowerCase().trim(); const preferences={...previous};
 const genres:[RegExp,Genre][]=[[/techno|rave|elektron/,'Techno'],[/afro|amapiano/,'Afrobeat'],[/hip.?hop|rap|r&b/,'Hip-Hop'],[/rooftop|dach|sunset/,'Rooftop'],[/bars?\b|cocktail/,'Bars'],[/date|jazz|romant/,'Dates']];
 for(const [pattern,genre] of genres) if(pattern.test(q)) {preferences.genre=genre;break;}
 for(const district of ['Kreuzberg','Friedrichshain','Neukölln','Mitte']) if(q.includes(district.toLowerCase())||district==='Neukölln'&&q.includes('neukoelln')) preferences.district=district;
 if(/egal|alle bezirke|ganz berlin/.test(q)) delete preferences.district;
 if(/alle vibes|überrasch|spontan/.test(q)) {delete preferences.genre;delete preferences.district;}
 const budget=q.match(/(?:bis|max(?:imal)?\.?|unter|budget)\s*(\d+)|(?:\b)(\d+)\s*(?:€|euro)/); if(budget) preferences.budget=Number(budget[1]||budget[2]);
 if(/kostenlos|gratis|umsonst/.test(q)) preferences.budget=0;
 if(/budget egal|preis egal/.test(q)) delete preferences.budget;
 if(/morgen|wochenende|freitag|samstag|november|2027/.test(q)) return {text:'Für diesen Zeitpunkt habe ich keine Demo-Daten. Die Beispielnächte finden am 20.10.2026 statt. Versuch „Heute Abend“ oder wähle einen Vibe.',events:[],preferences};
 const matches=events.filter(e=>(!preferences.genre||e.genre===preferences.genre)&&(!preferences.district||e.district===preferences.district)&&(preferences.budget===undefined||e.price<=preferences.budget));
 const recognized=preferences.genre||preferences.district||preferences.budget!==undefined||/heute|abend|event|party|club|spontan|überrasch|zeigen|los|vibe/.test(q);
 if(!recognized) return {text:'Lass uns deinen Abend finden. Eher treibender Techno, Afrobeat oder eine entspannte Bar? Du kannst auch Bezirk und Budget nennen, zum Beispiel „Techno bis 20 €“.',events:[],preferences};
 if(!matches.length) return {text:'Für diese Kombination habe ich kein passendes Demo-Event. Probiere „alle Bezirke“, „Budget egal“ oder „alle Vibes“ – ich passe deine Auswahl an.',events:[],preferences};
 const follow=preferences.budget===undefined?'Was ist dein Budget für den Eintritt?':!preferences.district?'Welcher Bezirk passt dir? Oder ist ganz Berlin okay?':'Das passt zu deinem Vibe. Die Pins zeigen dir die Orte auf der Karte.';
 return {text:`${preferences.genre?`${preferences.genre} klingt nach deinem Abend.`:'Berlin hat viele Nächte. Finden wir deine.'} ${matches.length===1?'Ich habe ein passendes Demo-Event':`Ich habe ${matches.length} passende Demo-Events`} für dich${preferences.budget!==undefined?` bis ${preferences.budget} €`:''}. ${follow}`,events:matches,preferences};
}
