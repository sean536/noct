/** Supplied images are personal-demo assets, never bundled into the public source. */
export const locationImageWidths=[360,640,960] as const;
export const locationImageWidthsFor=(originalWidth:number)=>[...locationImageWidths.filter(width=>width<originalWidth),originalWidth];
export const locationImages=[
 {id:'808-nachtklub',venue:'808 Nachtklub',aliases:['808 Nachtklub'],attachment:1,width:1280,height:720,position:'50% 50%'},
 {id:'bricks-club',venue:'BRICKS Club',aliases:['BRICKS Club'],attachment:2,width:1023,height:1280,position:'50% 50%'},
 {id:'amano-rooftop',venue:'AMANO Rooftop Bar am Berliner Hauptbahnhof',aliases:['AMANO Rooftop Bar am Berliner Hauptbahnhof','AMANO Rooftop Bar Hauptbahnhof','AMANO Rooftop am Berliner Hauptbahnhof'],attachment:3,width:1147,height:633,position:'45% 50%'},
 {id:'weekend-club',venue:'Weekend Club',aliases:['Weekend Club'],attachment:4,width:1280,height:851,position:'32% 50%'}
] as const;
export const locationImageFilename=(id:string,width:number)=>`${id}-${width}.webp`;
const normalize=(venue:string)=>venue.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');

export function locationImageFor(venue:string,privateDemo=process.env.NEXT_PUBLIC_NOCT_PRIVATE_LOCATION_IMAGES==='1'){
 if(!privateDemo)return undefined;
 const location=locationImages.find(location=>location.aliases.some(alias=>normalize(alias)===normalize(venue)));
 if(!location)return undefined;
 const path=(width:number)=>`/_private/club-photos/${locationImageFilename(location.id,width)}`;
 // A landscape photograph covers a taller 4:5 card: request its full painted width.
 const cover=Math.max(1,location.width/location.height/(4/5));
 const sizes=`(min-width: 900px) ${Math.ceil(388*cover)}px, (min-width: 488px) ${Math.ceil(440*cover)}px, calc(${(100*cover).toFixed(3)}vw - ${(48*cover).toFixed(3)}px)`;
 return {...location,src:path(640),srcSet:locationImageWidthsFor(location.width).map(width=>`${path(width)} ${width}w`).join(', '),sizes,alt:`Vom Nutzer bereitgestelltes Foto: ${location.venue}`};
}
