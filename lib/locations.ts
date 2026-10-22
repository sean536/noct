export interface VenueLocation {
 id:string;name:string;district:string;address:string;coords:[number,number];
 website:string;calendarUrl:string;coordinateSource:string;categories:string[];tourOrder:number;
}
/** Real places, independent of whether any current event is confirmed. */
export const locations:VenueLocation[]=[
 {tourOrder:3,id:'808-nachtklub',name:'808 Nachtklub',district:'Charlottenburg-Wilmersdorf',address:'Budapester Straße 38–40, 10787 Berlin',coords:[13.33802,52.50558],website:'https://808.berlin/',calendarUrl:'https://808.berlin/',coordinateSource:'https://www.openstreetmap.org/node/12372968542',categories:[]},
 {tourOrder:1,id:'bricks-club',name:'BRICKS Club',district:'Mitte',address:'Anton-Wilhelm-Amo-Straße 30, 10117 Berlin',coords:[13.39324,52.51213],website:'https://www.bricks-berlin.club/',calendarUrl:'https://www.bricks-berlin.club/events-guestlist',coordinateSource:'https://www.openstreetmap.org/node/1310466406',categories:[]},
 {tourOrder:2,id:'amano-rooftop',name:'AMANO Rooftop am Berliner Hauptbahnhof',district:'Mitte',address:'Heidestraße 62, 10557 Berlin',coords:[13.37039,52.52724],website:'https://www.amanogroup.com/de/bars/grand-central-rooftop-bar-berlin-hauptbahnhof',calendarUrl:'https://www.amanogroup.com/de/bars/grand-central-rooftop-bar-berlin-hauptbahnhof',coordinateSource:'https://www.openstreetmap.org/way/237687062',categories:['Rooftop','Bars']},
 {tourOrder:0,id:'weekend-club',name:'Weekend Club',district:'Mitte',address:'Alexanderstraße 7, 10178 Berlin',coords:[13.41642,52.52290],website:'https://www.weekendclub.berlin/',calendarUrl:'https://www.weekendclub.berlin/upcoming',coordinateSource:'https://www.openstreetmap.org/node/1162812586',categories:['Rooftop']},
 {tourOrder:4,id:'berghain',name:'Berghain',district:'Friedrichshain',address:'Am Wriezener Bahnhof, 10243 Berlin',coords:[13.44304,52.51117],website:'https://www.berghain.berlin/',calendarUrl:'https://www.berghain.berlin/de/program/',coordinateSource:'https://www.openstreetmap.org/node/6341225967',categories:[]},
 {tourOrder:5,id:'klunkerkranich',name:'Klunkerkranich',district:'Neukölln',address:'Karl-Marx-Straße 66, 12043 Berlin',coords:[13.43133,52.48207],website:'https://klunkerkranich.org/',calendarUrl:'https://klunkerkranich.org/events/',coordinateSource:'https://www.openstreetmap.org/node/2941462114',categories:['Rooftop','Bars']}
];
/** Preserve the existing four-stop order, then include both restored venues. */
export const locationTour=[...locations].sort((a,b)=>a.tourOrder-b.tourOrder);
export const locationStops=locations.map(location=>({id:`location:${location.id}`,coords:location.coords,venue:location.name,district:location.district}));
export const locationById=(id:string)=>locations.find(location=>location.id===id);
