import {test} from 'node:test';import assert from 'node:assert/strict';import {AssetSession} from '../prototypes/buildings/session';
const deferred=<T>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r});return {promise,resolve};};
test('a newer import wins and a stale completed asset is released rather than installed',async()=>{
 let oldDisposed=0,currentDisposed=0;const slow=deferred<{dispose():void}>(),session=new AssetSession<{dispose():void}>();
 const old=session.replace(()=>slow.promise);const cancelled=assert.rejects(old,/ersetzt|abgebrochen/);
 const current={dispose:()=>{currentDisposed++}},active=await session.replace(async()=>current);
 slow.resolve({dispose:()=>{oldDisposed++}});await cancelled;await Promise.resolve();assert.equal(active,current,'latest successful import must become active');assert.equal(oldDisposed,1);assert.equal(currentDisposed,0);session.clear();session.clear();assert.equal(currentDisposed,1);
});
test('deadline restores control and releases assets that finish after the deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const slow=deferred<{dispose():void}>(),session=new AssetSession<{dispose():void}>();let disposed=0;
 const pending=session.replace(()=>slow.promise,50),failed=assert.rejects(pending,/Zeitlimit/);t.mock.timers.tick(51);await failed;
 slow.resolve({dispose:()=>{disposed++}});await Promise.resolve();await Promise.resolve();assert.equal(disposed,1);session.clear();
});
