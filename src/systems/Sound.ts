/** Local synthesized engine, wind and score. Audio starts only after a player gesture. */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: OscillatorNode | null = null;
  private harmonic: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private wind: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private musicGain: GainNode | null = null;
  private nextBeat=0;
  private beat=0;
  radio=true;
  volume = .35;
  async start() {
    if (this.ctx) { await this.ctx.resume(); return; }
    this.ctx=new AudioContext(); const c=this.ctx;
    this.master=c.createGain();this.master.gain.value=this.volume*.4;this.master.connect(c.destination);
    this.musicGain=c.createGain();this.musicGain.gain.value=.7;this.musicGain.connect(this.master);
    this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=500;this.filter.connect(this.master);
    this.engineGain=c.createGain();this.engineGain.gain.value=.12;this.engineGain.connect(this.filter);
    this.engine=c.createOscillator();this.engine.type='sawtooth';this.engine.frequency.value=40;this.engine.connect(this.engineGain);this.engine.start();
    this.harmonic=c.createOscillator();this.harmonic.type='triangle';this.harmonic.frequency.value=80;this.harmonic.connect(this.engineGain);this.harmonic.start();
    const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const noise=c.createBufferSource();noise.buffer=buffer;noise.loop=true;const windFilter=c.createBiquadFilter();windFilter.type='lowpass';windFilter.frequency.value=900;this.wind=c.createGain();this.wind.gain.value=0;noise.connect(windFilter);windFilter.connect(this.wind);this.wind.connect(this.master);noise.start();
  }
  update(speed:number,throttle:number,active:boolean,skid:boolean) {
    const c=this.ctx;if(!c||!this.master||!this.engine||!this.harmonic||!this.engineGain||!this.filter||!this.wind)return;
    this.master.gain.setTargetAtTime(active?this.volume*.4:0,c.currentTime,.1);
    const gear=Math.min(5,Math.floor(Math.abs(speed)/12));const rpm=40+(Math.abs(speed)-gear*12)*6+throttle*12;
    this.engine.frequency.setTargetAtTime(rpm,c.currentTime,.08);this.harmonic.frequency.setTargetAtTime(rpm*2.01,c.currentTime,.08);
    this.engineGain.gain.setTargetAtTime(.13+throttle*.13,c.currentTime,.08);this.filter.frequency.setTargetAtTime(250+throttle*650+Math.abs(speed)*10,c.currentTime,.1);
    this.wind.gain.setTargetAtTime(Math.min(.2,Math.abs(speed)*.002)+(skid?.16:0),c.currentTime,.1);
    this.musicGain?.gain.setTargetAtTime(this.radio?.7:0,c.currentTime,.2);
    if(active&&this.radio)this.sequence();else this.nextBeat=c.currentTime;
  }
  /** Original mellow synth arrangement; scheduled against the audio clock. */
  private sequence(){
    const c=this.ctx;if(!c||!this.musicGain)return;
    if(this.nextBeat<c.currentTime-.4)this.nextBeat=c.currentTime;
    const chords=[[53,57,60,64],[57,60,64,67],[52,55,59,62],[55,59,62,66]];
    while(this.nextBeat<c.currentTime+.12){
      const chord=chords[Math.floor(this.beat/32)%chords.length];
      const note=chord[[0,2,1,3,2,0,3,1][this.beat%8]]+12;
      this.tone(note,this.nextBeat,.55,.055,'triangle');
      if(this.beat%8===0){this.tone(chord[0]-12,this.nextBeat,1.7,.13,'sine');for(const n of chord)this.tone(n,this.nextBeat,2.2,.025,'sine');}
      if(this.beat%4===0){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(100,this.nextBeat);o.frequency.exponentialRampToValueAtTime(35,this.nextBeat+.16);g.gain.setValueAtTime(.13,this.nextBeat);g.gain.exponentialRampToValueAtTime(.001,this.nextBeat+.2);o.connect(g);g.connect(this.musicGain);o.start(this.nextBeat);o.stop(this.nextBeat+.21);o.onended=()=>{o.disconnect();g.disconnect();};}
      this.nextBeat+=60/96/2;this.beat++;
    }
  }
  private tone(midi:number,start:number,duration:number,volume:number,type:OscillatorType){const c=this.ctx;if(!c||!this.musicGain)return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=440*2**((midi-69)/12);g.gain.setValueAtTime(.001,start);g.gain.linearRampToValueAtTime(volume,start+.04);g.gain.exponentialRampToValueAtTime(.001,start+duration);o.connect(g);g.connect(this.musicGain);o.start(start);o.stop(start+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
  /** Short, warm two-tone horn, routed through the player's volume setting. */
  horn(){
    const c=this.ctx;if(!c||!this.master)return;
    for(const frequency of [349,440]){
      const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=frequency;
      g.gain.setValueAtTime(.0001,c.currentTime);g.gain.linearRampToValueAtTime(.20,c.currentTime+.025);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.38);
      o.connect(g);g.connect(this.master);o.start();o.stop(c.currentTime+.40);o.onended=()=>{o.disconnect();g.disconnect();};
    }
  }
  cue(frequency=660,duration=.18) { const c=this.ctx;if(!c||!this.master)return;const o=c.createOscillator();const g=c.createGain();o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(Math.max(.00001,.24*this.volume*.4),c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration);o.onended=()=>{o.disconnect();g.disconnect();}; }
}
