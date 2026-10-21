/** Shared roof material functions. Entirely GPU surface detail; no roof-object scene graph. */
export const ROOF_SHADER=`
float roofHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float roofNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(roofHash(i),roofHash(i+vec2(1.,0.)),f.x),mix(roofHash(i+vec2(0.,1.)),roofHash(i+vec2(1.)),f.x),f.y);}
float roofBox(vec2 p,vec2 halfSize){vec2 aa=max(fwidth(p),vec2(.035)),d=halfSize-abs(p);return smoothstep(-aa.x,aa.x,d.x)*smoothstep(-aa.y,aa.y,d.y);}
float roofLine(float coordinate,float spacing,float width){float d=abs(mod(coordinate+spacing*.5,spacing)-spacing*.5),aa=max(fwidth(coordinate)*.8,.018);return 1.-smoothstep(width-aa,width+aa,d);}
vec3 roofSurface(vec2 uv,float seed,float heading,vec4 material,vec4 detail){
 float pixel=max(length(dFdx(uv)),length(dFdy(uv)));
 float fine=1.-smoothstep(.12,.85,pixel),medium=1.-smoothstep(.7,2.8,pixel);
 float angle=heading;mat2 rotate=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));vec2 q=rotate*uv;
 float weather=roofNoise(uv*.075+seed*43.);vec3 color=material.rgb*(.84+.25*weather);
 float kind=material.a;
 if(kind<.5){ // Bitumen: broad roll seams and subtle patched weathering.
  float seams=max(roofLine(q.x,2.1,.035),roofLine(q.y,7.3,.03));color*=1.-seams*.23*medium;
 }else if(kind<1.5){ // Gravel: soft aggregate, averaged at distance rather than aliased noise.
  color*=1.+(roofNoise(q*5.8)-.5)*.33*fine*u_quality;
 }else if(kind<3.5||kind>6.5){ // Zinc, copper and coated sheet metal: folded standing seams.
  float seams=roofLine(q.x,1.05,.026);color*=1.-seams*.30*medium;
  color*=.95+.075*smoothstep(.05,.94,fract(q.x/1.05))*medium;
  if(kind>2.5&&kind<3.5)color=mix(color,vec3(.15,.25,.19),weather*.23);
 }else if(kind<5.5){ // Only tagged tile/slate; no artificial roof pitch.
  vec2 tiles=vec2(q.x+mod(floor(q.y/.34),2.)*.20,q.y);
  float joints=max(roofLine(tiles.x,.4,.018),roofLine(tiles.y,.34,.022));
  float variation=roofHash(floor(tiles/vec2(.4,.34))+seed*91.);
  color*=1.+(variation-.5)*.20*fine;color*=1.-joints*.32*fine;
 }else{ // Low planted covering; a material variation, not invented vegetation models.
  color=mix(color*.75,color*1.18,mix(.5,roofNoise(q*.6+seed*19.),fine));
 }
 // One safe, inscribed accent per suitable roof, with no objects extending into courtyards/streets.
 float present=(1.-smoothstep(.65,2.1,pixel))*step(.5,detail.w);
 if(present>.001){
  vec2 p=rotate*(uv-detail.xy);float size=detail.z;vec3 before=color;
  if(detail.w<1.5){ // Framed skylight with broad glass panes.
   vec2 halfSize=vec2(.48,.67)*size;float rim=roofBox(p,halfSize),glass=roofBox(p,halfSize-vec2(.19));
   float shadow=roofBox(p+vec2(.34,-.45),halfSize+vec2(.07));color*=1.-shadow*.18;
   color=mix(color,vec3(.23,.26,.25),rim);vec3 glazing=mix(vec3(.055,.13,.17),vec3(.23,.37,.39),clamp(p.y/size+.5,0.,1.));
   float bars=max(roofLine(p.x,size*.40,.055),roofLine(p.y,size*.48,.055));color=mix(color,mix(glazing,vec3(.27,.29,.27),bars),glass);
  }else if(detail.w<2.5){ // Ventilation housing and two fan grilles.
   vec2 halfSize=vec2(.66,.43)*size;float housing=roofBox(p,halfSize);color*=1.-roofBox(p+vec2(.35,-.45),halfSize)*.2;
   color=mix(color,vec3(.30,.34,.34),housing);float fanDistance=min(length(p-vec2(size*.31,0.)),length(p+vec2(size*.31,0.)));
   float aa=max(fwidth(fanDistance),.04),fan=1.-smoothstep(size*.23-aa,size*.23+aa,fanDistance);color=mix(color,vec3(.07,.095,.10),fan);
   float grille=roofLine(p.x,.22,.04);color=mix(color,color*1.25,grille*fan*fine);
  }else if(detail.w<3.5){ // Small brick chimney cap, expressed as shaded surface detail.
   vec2 halfSize=vec2(.38,.38)*min(size,2.6);color*=1.-roofBox(p+vec2(.35,-.5),halfSize+vec2(.08))*.23;
   float body=roofBox(p,halfSize),cap=roofBox(p,halfSize-vec2(.15));color=mix(color,vec3(.27,.15,.105),body);
   color=mix(color,vec3(.055,.06,.055),cap);color*=1.-roofLine(p.y,.22,.025)*body*.13*fine;
  }else{ // Occasional inset timber terrace; no unsupported railing geometry.
   vec2 halfSize=vec2(.62,.61)*size;float deck=roofBox(p,halfSize),edge=deck-roofBox(p,halfSize-vec2(.16));
   vec3 wood=vec3(.23,.16,.105)*(1.-roofLine(p.x,.22,.018)*.22*fine);color=mix(color,wood,deck);color=mix(color,vec3(.11,.15,.12),edge);
   float planter=roofBox(p-vec2(halfSize.x-.42,halfSize.y-.42),vec2(.32));color=mix(color,vec3(.09,.17,.07),planter);
  }
  color=mix(before,color,present);
 }
 return color;
}
`;
