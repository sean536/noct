/** Procedural roof appearance, never a claim of surveyed roof materials or shapes. */
export interface RoofStyle {seed:number;kind:number;color:[number,number,number];flatDetails:boolean}
// 0 membrane, 1 gravel, 2 zinc, 3 copper, 4 clay tiles, 5 slate, 6 planted, 7 coated metal.
const colors=['#515656','#81796b','#617b81','#547867','#984e36','#455463','#5e7150','#856957'];
const names:Record<string,string>={red:'#9c4936',brown:'#795844',grey:'#737879',gray:'#737879',darkgrey:'#444d53',darkgray:'#444d53',black:'#343a3b',white:'#c4c1b6',green:'#607656',silver:'#929b9b',terracotta:'#ad6649',copper:'#617e6c',blue:'#566d80'};
export function stableRoofHash(value:string){let n=2166136261;for(let i=0;i<value.length;i++)n=Math.imul(n^value.charCodeAt(i),16777619);return n>>>0;}
function linearColor(raw:unknown):[number,number,number]|undefined{
 if(typeof raw!=='string')return;let value=raw.toLowerCase().trim();value=names[value]??value;
 if(/^#[a-f0-9]{3}$/.test(value))value='#'+value.slice(1).split('').map(v=>v+v).join('');
 if(!/^#[a-f0-9]{6}$/.test(value))return;
 return [1,3,5].map(start=>Math.pow(parseInt(value.slice(start,start+2),16)/255,2.2)) as [number,number,number];
}
export function roofStyle(properties:Record<string,unknown>,identity:string):RoofStyle{
 const hash=stableRoofHash(identity),seed=hash/4294967296,roll=hash%100;
 // Missing tags: plausible *planar* coverings, no invented pitched roof geometry.
 let kind=roll<26?0:roll<50?1:roll<72?2:roll<79?3:roll<89?6:7;
 const material=String(properties['roof:material']??properties.roof_material??'').toLowerCase();
 if(/^(roof_tiles|tiles|tile|clay|concrete_tiles|ceramic)$/.test(material))kind=4;
 else if(/^(slate|stone)$/.test(material))kind=5;
 else if(/^(zinc|metal|steel|aluminium|aluminum|corrugated_iron)$/.test(material))kind=2;
 else if(material==='copper')kind=3;
 else if(/^(gravel|pebbles)$/.test(material))kind=1;
 else if(/^(grass|green_roof|vegetated|plants)$/.test(material))kind=6;
 else if(/^(tar_paper|bitumen|asphalt|rubber|membrane)$/.test(material))kind=0;
 const color=linearColor(properties['roof:colour']??properties['roof:color']??properties.roof_colour??properties.roof_color)??linearColor(colors[kind])!;
 const shape=String(properties['roof:shape']??properties.roof_shape??'').toLowerCase();
 // A 2D footprint+height cannot prove a gable/ridge/dome; preserve the actual supplied flat plane.
 return {seed,kind,color,flatDetails:(!shape||shape==='flat')&&![4,5].includes(kind)};
}
