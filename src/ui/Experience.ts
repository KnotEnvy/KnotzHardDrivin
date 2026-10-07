import { VEHICLE_PAINTS } from '../entities/VehiclePaints';
import { MenuNavigation } from './MenuNavigation';
import { Journey, saveProgress, type Mode } from '../systems/Journey';
import { EXPEDITION, STAGES, roadX } from '../world/route';
export interface Actions { start(stage:number,mode:Mode):void; continueRun():void; resume():void; menu():void; reset():void; camera():void; cruise():void; paint(color:number):void; quality(value:string):void; key(code:string,pressed:boolean):void; }
export class Experience {
  performanceSummary="Drive for a few seconds to measure frame pacing.";
  private root:HTMLElement;
  private menuNavigation:MenuNavigation;
  private backAction:()=>void=()=>{};
  private selected=0;
  private lastPhase='';
  private minimap:CanvasRenderingContext2D|null=null;
  private controls:Actions;
  private noticeTime=0;
  private returnFocus:HTMLElement|null=null;
  constructor(private journey:Journey,actions:Actions) {
    this.controls=actions;this.root=document.getElementById('hud')!;this.selected=journey.save.selectedStage;
    this.menuNavigation=new MenuNavigation(()=>this.menuScope(),()=>this.backAction());
    this.root.innerHTML=`
      <div class="vignette"></div>
      <header class="brand"><span class="brand-mark">H<span>D</span></span><span>HARD DRIVIN’<small>PACIFIC RUN</small></span></header>
      <div class="edition">AN OPEN-ROAD DRIVING EXPERIENCE <span>VOL. 01 / PACIFIC</span></div>
      <main id="menu" class="menu">
        <div class="intro"><div class="eyebrow"><i></i> THE OPEN ROAD IS CALLING</div><h1>PACIFIC<br><em>RUN.</em></h1><p>A full tank. A fading sun.<br>Nowhere to be but out there.</p>
        <div class="start-row"><button class="primary" id="start">START YOUR JOURNEY <span>↗</span></button><button class="icon-button" id="settings" aria-label="Open settings">⚙</button></div>
        <button class="text-button" id="expedition">THE GRAND TOUR <span id="expedition-record">5.9 km / one uninterrupted drive</span></button><button class="text-button" id="free">JUST DRIVE <span>Free roam · no timer →</span></button></div>
        <aside class="car-label"><span class="eyebrow">YOUR RIDE / 01</span><h2>VELA GT</h2><p>3.2L FLAT-SIX <span>REAR-WHEEL SPIRIT</span></p><div class="swatches" aria-label="Car paint">${VEHICLE_PAINTS.map(({color:c,name:n})=>`<button aria-label="${n} paint" title="${n}" data-color="${c}" style="--swatch:#${Number(c).toString(16)}"></button>`).join('')}</div></aside>
        <section class="route-select"><div class="section-line"><span>THE PACIFIC COLLECTION</span><button id="continue-run" class="resume-run hidden">CONTINUE DRIVE &#8599;</button><span id="collection-progress">3 CHAPTERS · 5.8 KM</span></div><div class="route-cards" id="routes"></div></section>
        <footer><span>BUILT FOR THE LOVE OF DRIVING.</span><span>WASD / ARROWS TO DRIVE <b>·</b> GAMEPAD READY</span></footer>
      </main>
      <div id="driving" class="driving hidden">
        <div class="route-info"><span class="eyebrow" id="region"></span><h2 id="destination"></h2><span id="pace-target" class="pace-target"></span><div class="route-progress"><i id="progress"></i></div><span id="remaining"></span></div>
        <div class="timer"><small id="timer-label">TIME REMAINING</small><strong id="time">01:40</strong><span id="checkpoints"></span></div>
        <div class="map-panel"><canvas id="minimap" width="200" height="170" aria-label="Route minimap"></canvas><span>PACIFIC HIGHWAY <b>↑ N</b></span></div>
        <div class="telemetry"><div class="gear">AUTO <b id="gear">N</b></div><div class="speed"><strong id="speed">0</strong><span>KM/H</span></div><div class="rev-bar"><i id="revs"></i></div><div class="boost-label"><button class="boost-trigger" data-key="ShiftLeft" aria-label="Hold for overdrive">OVERDRIVE <kbd>SHIFT</kbd></button><span id="boost-pct">100%</span></div><div class="boost-bar"><i id="boost"></i></div></div>
        <div class="drive-tools"><button id="pause">PAUSE <kbd>ESC</kbd></button><button id="camera">CAMERA <kbd>C</kbd></button><button id="cruise" aria-pressed="false">CRUISE <kbd>E</kbd></button><button id="recover">RECOVER <kbd>R</kbd></button></div>
        <button id="radio" class="radio-panel" aria-label="Toggle Radio Pacific"><i>♫</i><span>RADIO PACIFIC<small>LAST LIGHT · ORIGINAL SYNTH SESSION</small></span><b>ON</b></button><div class="controls-hint">WASD / ARROWS <span>Drive</span> &nbsp; SPACE <span>Handbrake</span> &nbsp; SHIFT <span>Overdrive</span></div>
        <button class="horn-trigger" data-key="KeyH" aria-label="Honk and greet nearby wildlife">HORN <kbd>H</kbd></button><div id="touch" class="touch-controls"><div><button data-key="ArrowLeft" aria-label="Steer left">◀</button><button data-key="ArrowRight" aria-label="Steer right">▶</button></div><div><button data-key="Space" aria-label="Handbrake">DRIFT</button><button data-key="ArrowDown" aria-label="Brake and reverse">BRAKE</button><button class="gas" data-key="ArrowUp" aria-label="Accelerate">GAS</button></div></div>
      </div>
      <div id="countdown" class="countdown hidden"></div><div id="notice" class="notice" role="status"></div>
      <div id="save-status" class="save-status hidden" role="status"></div>
      <div id="modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title"></div>`;
    const on=(id:string,fn:()=>void)=>document.getElementById(id)!.addEventListener('click',fn);
    on('continue-run',()=>this.continueBriefing());on('start',()=>this.briefing('tour'));on('expedition',()=>this.briefing('expedition'));on('free',()=>actions.start(this.selected,'free'));on('settings',()=>this.settings());on('pause',()=>this.pause());on('camera',actions.camera);on('cruise',actions.cruise);on('recover',actions.reset);on('radio',()=>{this.journey.save.radio=!this.journey.save.radio;this.persistSettings();document.getElementById('radio')!.setAttribute('aria-pressed',String(this.journey.save.radio));document.querySelector('#radio b')!.textContent=this.journey.save.radio?'ON':'OFF';});document.getElementById('radio')!.setAttribute('aria-pressed',String(this.journey.save.radio));document.querySelector('#radio b')!.textContent=this.journey.save.radio?'ON':'OFF';
    this.root.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b=>b.addEventListener('click',()=>{const color=Number(b.dataset.color);this.journey.save.color=color;this.persistSettings();actions.paint(color);this.updateSwatches();}));
    this.root.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>{const code=b.dataset.key!;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);actions.key(code,true);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>actions.key(code,false));});
    document.addEventListener('keydown',e=>{
      const modal=document.getElementById('modal')!;
      const scope=this.menuScope();if(!scope)return;
      if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key)&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLSelectElement)){
        this.menuNavigation.move(['ArrowDown','ArrowRight'].includes(e.key)?1:-1);e.preventDefault();e.stopPropagation();return;
      }
      if(modal.classList.contains('hidden'))return;
      if(e.key==='Escape'){this.backAction();e.preventDefault();e.stopPropagation();return;}
      if(e.key!=='Tab')return;
      const focusable=Array.from(modal.querySelectorAll<HTMLElement>('button,input,select'));const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){last?.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first?.focus();e.preventDefault();}
    });
    this.minimap=(document.getElementById('minimap') as HTMLCanvasElement).getContext('2d');this.routes();this.updateSwatches();
  }
  private menuScope(){
    const modal=document.getElementById('modal')!;
    if(!modal.classList.contains('hidden'))return modal;
    return this.journey.phase==='menu'?document.getElementById('menu'):null;
  }
  updateMenuInput(){this.menuNavigation.update();}
  private updateSwatches(){this.root.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b=>{const active=Number(b.dataset.color)===this.journey.save.color;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});}
  private persistSettings(){this.journey.saveFailed=!saveProgress(this.journey.save);this.storageStatus();}
  private storageStatus(){
    const status=document.getElementById('save-status')!,j=this.journey;
    status.classList.toggle('hidden',!j.saveFailed&&!j.recoverySaveFailed);
    status.textContent=j.recoverySaveFailed?'Drive recovery could not be saved. Keep this tab open to preserve your current session.':j.saveFailed?'Changes apply for this session. Device storage is unavailable; they may be lost when you leave.':'';
  }
  private routes(){
    const focused=(document.activeElement as HTMLElement)?.dataset.stage;
    const save=this.journey.save;this.selected=save.selectedStage;
    document.getElementById('continue-run')!.classList.toggle('hidden',!this.journey.pendingRun);
    document.getElementById('collection-progress')!.textContent=`${save.medals.filter(Boolean).length} / 3 CHAPTERS COMPLETE`;
    document.getElementById('start')!.innerHTML=`PLAY CHAPTER ${String(this.selected+1).padStart(2,'0')} <span>&#8599;</span>`;
    document.getElementById('expedition-record')!.textContent=save.expeditionBest?`${['','Bronze','Silver','Gold'][save.expeditionMedal]} / Best ${formatTime(save.expeditionBest)}`:'5.9 km / one uninterrupted drive';
    document.getElementById('routes')!.innerHTML=STAGES.map((s,i)=>{
      const locked=i>0&&!save.medals[i-1],medal=['','BRONZE','SILVER','GOLD'][save.medals[i]];
      return `<button class="route-card ${this.selected===i?'selected':''}" data-stage="${i}" aria-pressed="${this.selected===i}" ${locked?'disabled':''}><span class="route-number">0${i+1}</span><div><small>${locked?'COMPLETE CHAPTER '+i:s.region}</small><h3>${s.name}</h3><p>${((s.end-s.start)/1000).toFixed(1)} KM <span>&middot;</span> ${save.best[i]?medal+' / BEST '+formatTime(save.best[i]):['COASTAL CRUISE','FOREST RUN','SUNSET SPRINT'][i]}</p></div><span class="route-status">${locked?'&#8985;':save.medals[i]?'&#9733;'.repeat(save.medals[i]):'&#8599;'}</span></button>`;
    }).join('');
    this.root.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.addEventListener('click',()=>{
      this.selected=Number(b.dataset.stage);this.journey.save.selectedStage=this.selected;this.persistSettings();this.routes();
      this.root.querySelector<HTMLButtonElement>(`[data-stage="${this.selected}"]`)?.focus();
    }));
    if(focused!==undefined)this.root.querySelector<HTMLButtonElement>(`[data-stage="${focused}"]`)?.focus();
  }
  notice(text:string) {document.getElementById('notice')!.textContent=text;document.getElementById('notice')!.classList.add('visible');this.noticeTime=performance.now()+2400;}
  update(speed:number,s:number,x:number,boost:number,cruise=false) {
    const j=this.journey;const stage=j.route;this.storageStatus();document.getElementById('cruise')!.setAttribute('aria-pressed',String(cruise));
    if(j.phase!==this.lastPhase){this.lastPhase=j.phase;document.body.dataset.phase=j.phase;document.getElementById('menu')!.classList.toggle('hidden',j.phase!=='menu');document.getElementById('driving')!.classList.toggle('hidden',j.phase==='menu'||j.phase==='results');if(j.phase==='results')this.results();else if(j.phase==='paused')this.pause();else this.closeModal();if(j.phase==='menu')this.routes();}
    const countdown=document.getElementById('countdown')!;countdown.classList.toggle('hidden',j.phase!=='countdown');if(j.phase==='countdown'){const content=`<small>${stage.name}</small><strong>${Math.max(1,Math.ceil(j.countdown))}</strong><span>THE ROAD IS YOURS</span>`;if(countdown.innerHTML!==content)countdown.innerHTML=content;}
    if(performance.now()>this.noticeTime)document.getElementById('notice')!.classList.remove('visible');
    if(j.phase==='menu'||j.phase==='results')return;
    const set=(id:string,value:string)=>{const element=document.getElementById(id)!;if(element.textContent!==value)element.textContent=value;};
    set('region',j.mode==='tour'?stage.region:(s>=3900?STAGES[2]:s>=1850?STAGES[1]:STAGES[0]).region);set('destination',j.mode==='free'?'The road is yours.':stage.landmark);set('remaining',j.mode==='free'?`${(Math.max(0,s)/1000).toFixed(1)} KM / FREE DRIVE`:`${(Math.max(0,stage.end-s)/1000).toFixed(2)} KM TO DESTINATION`);
    set('pace-target',j.mode==='free'?'':`GOLD ${formatTime(stage.gold)} / SILVER ${formatTime(stage.silver)}`);
    set('timer-label',j.mode==='free'?'TIME ON THE ROAD':'TIME REMAINING');set('time',formatTime(j.mode==='free'?j.elapsed:Math.max(0,stage.limit-j.elapsed)));set('checkpoints',j.mode==='free'?'NO CLOCK. NO LIMITS.':`${j.checkpoint} / ${j.gateCount} CHECKPOINTS`);
    set('speed',String(Math.round(Math.abs(speed)*3.6)));set('gear',speed< -1?'R':speed<1?'N':String(Math.min(6,1+Math.floor(speed/12))));
    document.getElementById('progress')!.style.width=`${Math.min(100,j.distance/(stage.end-stage.start)*100)}%`;
    document.getElementById('revs')!.style.width=`${Math.min(100,20+Math.abs(speed)%12/12*80)}%`;document.getElementById('boost')!.style.width=`${boost}%`;set('boost-pct',`${Math.round(boost)}%`);this.map(s,x);
  }
  private map(s:number,x:number){const c=this.minimap;if(!c)return;c.clearRect(0,0,200,170);c.lineCap='round';const scale=.23;const px=100;const py=130;const road=(color:string,width:number)=>{c.beginPath();for(let d=-130;d<=550;d+=10){const mx=px+(roadX(s+d)-x)*scale,my=py-d*.23;if(d===-130)c.moveTo(mx,my);else c.lineTo(mx,my);}c.strokeStyle=color;c.lineWidth=width;c.stroke();};road('#5b675a',10);road('#c9c8ad',3);c.fillStyle='#f5be69';c.beginPath();c.moveTo(px,py-7);c.lineTo(px-5,py+5);c.lineTo(px+5,py+5);c.closePath();c.fill();}
  pause(){this.journey.pause();this.showModal(`<div class="eyebrow">TAKE A BREATHER</div><h2 id="modal-title">Enjoy the view.</h2><p>${this.journey.mode==='free'?'Your free drive is paused.':'Your drive is paused. You can return to the garage and continue from your last checkpoint.'}</p><p class="performance-readout">${this.performanceSummary}</p><button class="primary" id="resume">BACK TO THE ROAD ↗</button><div class="modal-actions"><button id="retry">Restart ${this.journey.mode==='expedition'?'Grand Tour':this.journey.mode==='free'?'free drive':'chapter'}</button><button id="pause-settings">Settings & controls</button><button id="home">Return to garage</button></div>`);this.bind('resume',()=>this.controls.resume());this.bind('retry',()=>this.confirmReplacement(()=>this.controls.start(this.journey.stage,this.journey.mode),()=>this.pause(),this.journey.mode==='free'));this.bind('home',()=>this.controls.menu());this.bind('pause-settings',()=>this.settings());}
  private results(){const j=this.journey;this.showModal(`<div class="eyebrow">${j.success?'DESTINATION REACHED':'THE SUN GOT AWAY'}</div><div class="medals">${j.success?'★'.repeat(j.medal)+'☆'.repeat(3-j.medal):'↺'}</div><h2 id="modal-title">${j.success?(j.mode==='expedition'||j.stage===2?'What a journey.':'Made it in style.'):'One more run?'}</h2><p>${j.success?j.route.landmark+' · '+['','BRONZE','SILVER','GOLD'][j.medal]+' MEDAL. '+(j.resumed?'Resumed drive: your full-run pace ghost is unchanged.':'Your fastest recorded run becomes your pace ghost.'):'Time ran out. Carry speed through the bends and use overdrive on the straights.'}</p>${j.saveFailed?'<p role="alert">This drive could not be saved on this device. Your current session can continue.</p>':''}<div class="result-stats"><div><small>DRIVE TIME</small><b>${formatTime(j.elapsed)}</b></div><div><small>NEAR MISSES</small><b>${j.nearMisses}</b></div><div><small>BEST TIME</small><b>${j.bestTime?formatTime(j.bestTime):'—'}</b></div></div><button class="primary" id="next">${j.success&&j.mode==='tour'&&j.stage<2?'NEXT CHAPTER ↗':'DRIVE AGAIN ↗'}</button><div class="modal-actions"><button id="home">Return to garage</button></div>`);this.bind('next',()=>this.controls.start(j.success&&j.mode==='tour'&&j.stage<2?j.stage+1:j.stage,j.mode));this.bind('home',()=>this.controls.menu());}
  private confirmReplacement(start:()=>void,cancel:()=>void,free=false){
    this.showModal(`<div class="eyebrow">START FRESH</div><h2 id="modal-title">${free?'Restart free drive?':'Replace this drive?'}</h2><p>${free?'You will return to the start of this free drive. Your saved timed drive stays available.':'Your unfinished drive will be replaced. Earned medals and best times stay in your collection.'}</p><button class="primary" id="keep-drive">KEEP CURRENT DRIVE</button><div class="modal-actions"><button id="replace-drive">Start a new drive</button></div>`);
    this.backAction=cancel;this.bind('keep-drive',cancel);this.bind('replace-drive',start);
  }
  private continueBriefing(){
    const saved=this.journey.pendingRun;if(!saved)return;
    const route=saved.mode==='expedition'?EXPEDITION:STAGES[saved.stage];
    this.showModal(`<div class="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2 id="modal-title">${route.name}</h2><p>Checkpoint ${saved.checkpoint} / ${saved.mode==='expedition'?12:4} &middot; ${formatTime(saved.elapsed)} elapsed</p><p>You will return to your last checkpoint, at rest, with three seconds added. Overdrive recharges from empty. Medals and best times still count; this resumed drive will not replace your full-run pace ghost.</p><button class="primary" id="resume-saved">CONTINUE DRIVE</button><div class="modal-actions"><button id="cancel-continue">Back to garage</button></div>`);
    this.bind('resume-saved',()=>this.controls.continueRun());this.bind('cancel-continue',()=>this.closeModal());
  }
  private briefing(mode:Mode){
    const full=mode==='expedition';
    const route=full?EXPEDITION:STAGES[this.selected];
    const best=full?this.journey.save.expeditionBest:this.journey.save.best[this.selected];
    this.showModal(`<div class="eyebrow">${full?'THE PACIFIC GRAND TOUR':'CHAPTER '+(this.selected+1)}</div><h2 id="modal-title">${route.name}</h2><p>${route.subtitle}</p><div class="briefing-route">${full?'PELICAN POINT &rarr; CYPRESS RIDGE &rarr; HORIZON BAY':route.landmark}</div><div class="result-stats"><div><small>DISTANCE</small><b>${((route.end-route.start)/1000).toFixed(1)} km</b></div><div><small>TIME LIMIT</small><b>${formatTime(route.limit)}</b></div><div><small>GATES</small><b>${full?12:4}</b></div></div><p>Pass every gate in order. Recovery adds three seconds.<br>Gold ${formatTime(route.gold)} / Silver ${formatTime(route.silver)}<br>${best?'Your best: '+formatTime(best):'Finish to record your pace ghost.'}</p><button class="primary" id="begin-drive">HIT THE ROAD</button><div class="modal-actions"><button id="cancel-drive">Back to garage</button></div>`);
    this.bind('begin-drive',()=>{const start=()=>this.controls.start(full?0:this.selected,mode);if(this.journey.pendingRun)this.confirmReplacement(start,()=>this.briefing(mode));else start();});
    this.bind('cancel-drive',()=>this.closeModal());
  }
  private settings(){const wasMenu=this.journey.phase==='menu';this.showModal(`<div class="eyebrow">MAKE IT YOUR DRIVE</div><h2 id="modal-title">The essentials.</h2><label class="setting">Sound volume <input id="volume" aria-label="Sound volume" type="range" min="0" max="1" step=".05" value="${this.journey.save.volume}"></label><label class="setting">Graphics <select id="quality"><option value="auto" ${this.journey.save.quality==='auto'?'selected':''}>Auto · adapts resolution</option><option value="high" ${this.journey.save.quality==='high'?'selected':''}>High · shadows & bloom</option><option value="balanced" ${this.journey.save.quality==='balanced'?'selected':''}>Balanced · lower resolution</option><option value="performance" ${this.journey.save.quality==='performance'?'selected':''}>Performance · slower PCs</option></select></label><label class="setting">Best-run ghost <input id="ghost-setting" aria-label="Show best-run ghost" type="checkbox" ${this.journey.save.ghost?'checked':''}></label><div class="key-guide"><span>WASD / Arrows <b>Accelerate, brake & steer</b></span><span>Space / Gamepad A <b>Handbrake</b></span><span>Shift / Gamepad RB <b>Overdrive · regenerates</b></span><span>C / Gamepad Y <b>Chase / hood camera</b></span><span>E / Gamepad D-pad ↑ <b>Cruise · you steer</b></span><span>H / Gamepad X <b>Horn &middot; say hello along the road</b></span><span>R / Gamepad B <b>Recover to last checkpoint</b></span><span>Esc / Start <b>Pause</b></span><span>Gamepad RT / LT <b>Throttle / brake</b></span><span>D-pad / left stick <b>Navigate menus</b></span><span>Gamepad A / B <b>Select / back</b></span><span>Touch <b>On-screen driving controls</b></span></div><button class="primary" id="done">ALL SET ↗</button>`);
    this.backAction=()=>{if(wasMenu)this.closeModal();else this.pause();};
    document.getElementById('ghost-setting')!.addEventListener('change',e=>{this.journey.save.ghost=(e.target as HTMLInputElement).checked;this.persistSettings();});
    const volume=document.getElementById('volume') as HTMLInputElement;volume.addEventListener('input',()=>{this.journey.save.volume=Number(volume.value);this.persistSettings();});const quality=document.getElementById('quality') as HTMLSelectElement;quality.addEventListener('change',()=>{this.journey.save.quality=quality.value;this.persistSettings();this.controls.quality(quality.value);});this.bind('done',()=>{if(wasMenu)this.closeModal();else this.pause();});
  }
  private showModal(html:string){this.backAction=()=>{if(this.journey.phase==='paused')this.controls.resume();else if(this.journey.phase==='results')this.controls.menu();else this.closeModal();};const m=document.getElementById('modal')!;if(m.classList.contains('hidden'))this.returnFocus=document.activeElement as HTMLElement;document.getElementById('menu')!.inert=true;document.getElementById('driving')!.inert=true;m.innerHTML=`<div class="modal-card">${html}</div>`;m.classList.remove('hidden');m.querySelector<HTMLButtonElement>('button')?.focus();}
  private closeModal(){document.getElementById('modal')!.classList.add('hidden');document.getElementById('menu')!.inert=false;document.getElementById('driving')!.inert=false;if(this.journey.phase==='driving'||this.journey.phase==='countdown')document.getElementById('game')?.focus();else if(this.returnFocus?.isConnected)this.returnFocus.focus();this.returnFocus=null;}
  private bind(id:string,fn:()=>void){document.getElementById(id)!.addEventListener('click',fn);}
}
export function formatTime(seconds:number){const s=Math.max(0,seconds);return `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;}
