import {distanceMeters,positionIssue} from './geo.js';
// Original soft pentatonic loop, synthesized locally: no audio download or third-party track.
export class WalkingMusic {
 constructor(storage){this.storage=storage;try{this.enabled=storage.getItem('dream-mender:walking-music:v1')==='on';}catch{this.enabled=false;}this.ctx=null;this.master=null;this.playing=false;this.lastMotion=-Infinity;this.gpsMovingUntil=0;this.previousGPS=null;this.nextNote=0;this.step=0;this.unavailable=false;}
 unlock(){if(!this.enabled)return;try{if(!this.ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio unavailable');this.ctx=new Audio();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);}this.ctx.resume().catch(()=>{this.unavailable=true;});}catch{this.unavailable=true;}}
 toggle(){this.enabled=!this.enabled;try{this.storage.setItem('dream-mender:walking-music:v1',this.enabled?'on':'off');}catch{}if(this.enabled)this.unlock();else this.update(false,false);return this.enabled;}
 observeGPS(position){
  if(positionIssue(position)){this.gpsMovingUntil=0;this.previousGPS=null;return;}
  let moving=Number.isFinite(position.speed)&&position.speed>=.35&&position.speed<=4;
  const previous=this.previousGPS;if(!Number.isFinite(position.speed)&&previous){const seconds=(position.timestamp-previous.timestamp)/1000,distance=distanceMeters(previous,position);moving=seconds>=.5&&seconds<=10&&distance>=Math.max(2,position.accuracy*.2)&&distance/seconds>=.35&&distance/seconds<=4;}
  this.previousGPS=position;this.gpsMovingUntil=moving?performance.now()+2500:0;
 }
 update(moving,allowed=true){
  const now=performance.now();if(moving&&allowed)this.lastMotion=now;
  const playing=!!(this.enabled&&allowed&&this.ctx?.state==='running'&&now-this.lastMotion<1000);
  if(!this.ctx||!this.master){this.playing=false;return;}
  if(playing!==this.playing){this.master.gain.cancelScheduledValues(this.ctx.currentTime);this.master.gain.setTargetAtTime(playing ? .28 : 0,this.ctx.currentTime,.15);if(playing)this.nextNote=this.ctx.currentTime+.03;}
  this.playing=playing;if(!allowed)this.lastMotion=-Infinity;if(!playing)return;
  const melody=[60,64,67,72,69,67,64,62,60,64,69,67,64,62,60,67];
  while(this.nextNote<this.ctx.currentTime+.15){const step=this.step++%melody.length;this.note(melody[step],this.nextNote,.085);if(step%4===0)this.note(step<8?48:45,this.nextNote,.045);this.nextNote+=.52;}
 }
 note(midi,time,volume){const oscillator=this.ctx.createOscillator(),gain=this.ctx.createGain();oscillator.type='sine';oscillator.frequency.value=440*2**((midi-69)/12);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.09);gain.gain.exponentialRampToValueAtTime(.0001,time+.75);oscillator.connect(gain);gain.connect(this.master);oscillator.start(time);oscillator.stop(time+.8);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}
}
