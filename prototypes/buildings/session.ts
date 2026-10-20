export class AssetSession<T extends {dispose():void}> {
 private pending?:AbortController;
 private active?:T;
 async replace(factory:(signal:AbortSignal)=>Promise<T>,timeoutMs=12000):Promise<T>{
  this.pending?.abort(Error('Import abgebrochen oder ersetzt.'));
  const controller=new AbortController();this.pending=controller;const {signal}=controller;
  let abort!:()=>void;
  const aborted=new Promise<never>((_,reject)=>{abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});});
  const timer=setTimeout(()=>controller.abort(Error('Zeitlimit beim Modellimport überschritten.')),timeoutMs);
  try{
   const loading=factory(signal).then(asset=>{if(signal.aborted){asset.dispose();throw signal.reason;}return asset;});
   const asset=await Promise.race([loading,aborted]);
   if(signal.aborted){asset.dispose();throw signal.reason;}
   this.active?.dispose();this.active=asset;return asset;
  }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);if(this.pending===controller)this.pending=undefined;}
 }
 clear():void{this.pending?.abort(Error('Import abgebrochen oder ersetzt.'));this.pending=undefined;const active=this.active;this.active=undefined;active?.dispose();}
}
