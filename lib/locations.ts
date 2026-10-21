export interface VenueLocation {
 id:string;name:string;district:string;address:string;coords:[number,number];
 website:string;calendarUrl:string;coordinateSource:string;categories:string[];
}
/** Real places, independent of whether any current event is confirmed. */
export const locations:VenueLocation[]=[
 {id:'808-nachtklub',name:'808 Nachtklub',district:'Charlottenburg-Wilmersdorf',address:'Budapester Straße 38–40, 10787 Berlin',coords:[13.33802,52.50558],website:'https://808.berlin/',calendarUrl:'https://808.berlin/',coordinateSource:'https://www.openstreetmap.org/node/12372968542',categories:[]},
 {id:'bricks-club',name:'BRICKS Club',district:'Mitte',address:'Anton-Wilhelm-Amo-Straße 30, 10117 Berlin',coords:[13.39324,52.51213],website:'https://www.bricks-berlin.club/',calendarUrl:'https://www.bricks-berlin.club/events-guestlist',coordinateSource:'https://www.openstreetmap.org/node/1310466406',categories:[]},
 {id:'amano-rooftop',name:'AMANO Rooftop am Berliner Hauptbahnhof',district:'Mitte',address:'Heidestraße 62, 10557 Berlin',coords:[13.37039,52.52724],website:'https://www.amanogroup.com/de/bars/grand-central-rooftop-bar-berlin-hauptbahnhof',calendarUrl:'https://www.amanogroup.com/de/bars/grand-central-rooftop-bar-berlin-hauptbahnhof',coordinateSource:'https://www.openstreetmap.org/way/237687062',categories:['Rooftop','Bars']},
 {id:'weekend-club',name:'Weekend Club',district:'Mitte',address:'Alexanderstraße 7, 10178 Berlin',coords:[13.41642,52.52290],website:'https://www.weekendclub.berlin/',calendarUrl:'https://www.weekendclub.berlin/upcoming',coordinateSource:'https://www.openstreetmap.org/node/1162812586',categories:['Rooftop']}
];
export const locationStops=locations.map(location=>({id:`location:${location.id}`,coords:location.coords,venue:location.name,district:location.district}));
export const locationById=(id:string)=>locations.find(location=>location.id===id);
