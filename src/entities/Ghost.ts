import * as THREE from 'three';
import { GhostData, GhostFrame } from '../systems/GhostRecorder';

export class Ghost {
  private ghostData: GhostData;
  private mesh: THREE.Object3D;
  private scene: THREE.Scene;
  private isPlaying: boolean = false;
  private playbackTime: number = 0;
  private currentFrameIndex: number = 0;
  private playbackSpeed: number = 1.0;
  private material: THREE.ShaderMaterial;
  private tempVector3: THREE.Vector3 = new THREE.Vector3();
  private tempQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private tempWheelRotations: [number, number, number, number] = [0, 0, 0, 0];

  constructor(ghostData: GhostData, scene: THREE.Scene, vehicleTemplate?: THREE.Object3D) {
    this.ghostData = ghostData;
    this.scene = scene;
    this.material = this.createGhostMaterial();
    this.mesh = this.createGhostMesh(vehicleTemplate);
    this.scene.add(this.mesh);
  }

  private createGhostMaterial(): THREE.ShaderMaterial {
    const vShader = `varying vec3 vNormal;
void main(){vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
    
    const fShader = `uniform vec3 baseColor;uniform float opacity;varying vec3 vNormal;
void main(){gl_FragColor=vec4(baseColor,opacity);}`;
    
    return new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: new THREE.Color(0x00ffff) },
        opacity: { value: 0.6 },
      },
      vertexShader: vShader,
      fragmentShader: fShader,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }

  private createGhostMesh(vehicleTemplate?: THREE.Object3D): THREE.Object3D {
    let template = vehicleTemplate || this.scene.getObjectByName('vehicle');
    if (!template) {
      const geometry = new THREE.BoxGeometry(2, 1, 4);
      const mesh = new THREE.Mesh(geometry, this.material);
      mesh.name = 'phantom-photon-placeholder';
      return mesh;
    }
    const cloned = template.clone();
    cloned.name = 'phantom-photon';
    cloned.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        child.material = this.material;
      }
    });
    return cloned;
  }

  public startPlayback(speed: number = 1.0): void {
    this.isPlaying = true;
    this.playbackTime = 0;
    this.currentFrameIndex = 0;
    this.playbackSpeed = speed;
  }

  public stopPlayback(): void {
    this.isPlaying = false;
  }

  public update(deltaTime: number): void {
    if (!this.isPlaying || this.ghostData.frames.length === 0) return;
    this.playbackTime += deltaTime * this.playbackSpeed;
    const lapDuration = this.ghostData.lapTime / 1000;
    if (this.playbackTime > lapDuration) {
      this.playbackTime = 0;
      this.currentFrameIndex = 0;
    }
    const frames = this.ghostData.frames;
    let nextFrameIndex = this.currentFrameIndex;
    while (nextFrameIndex < frames.length && frames[nextFrameIndex].time < this.playbackTime) {
      nextFrameIndex++;
    }
    this.currentFrameIndex = Math.max(0, nextFrameIndex - 1);
    const nextIndex = Math.min(nextFrameIndex, frames.length - 1);
    const currentFrame = frames[this.currentFrameIndex];
    const nextFrame = frames[nextIndex];
    const t = currentFrame.time === nextFrame.time ? 0 :
      Math.max(0, Math.min(1, (this.playbackTime - currentFrame.time) / (nextFrame.time - currentFrame.time)));
    this.applyInterpolatedFrame(currentFrame, nextFrame, t);
  }

  private applyInterpolatedFrame(currentFrame: GhostFrame, nextFrame: GhostFrame, t: number): void {
    this.tempVector3.set(currentFrame.position[0], currentFrame.position[1], currentFrame.position[2]);
    const nextPos = new THREE.Vector3(nextFrame.position[0], nextFrame.position[1], nextFrame.position[2]);
    this.tempVector3.lerp(nextPos, t);
    this.mesh.position.copy(this.tempVector3);
    this.tempQuaternion.set(currentFrame.rotation[0], currentFrame.rotation[1], currentFrame.rotation[2], currentFrame.rotation[3]);
    const nextRot = new THREE.Quaternion(nextFrame.rotation[0], nextFrame.rotation[1], nextFrame.rotation[2], nextFrame.rotation[3]);
    THREE.Quaternion.slerpFlat(this.tempQuaternion as any, 0, this.tempQuaternion as any, 0, nextRot as any, 0, t);
    this.mesh.quaternion.copy(this.tempQuaternion);
  }

  public getPosition(): THREE.Vector3 { return this.mesh.position; }
  public getQuaternion(): THREE.Quaternion { return this.mesh.quaternion; }
  public setVisible(visible: boolean): void { this.mesh.visible = visible; }
  public isVisible(): boolean { return this.mesh.visible; }
  public getMesh(): THREE.Object3D { return this.mesh; }
  
  public getPlaybackInfo(): { isPlaying: boolean; currentTime: number; totalTime: number; progress: number; currentFrameIndex: number } {
    const totalTime = this.ghostData.lapTime / 1000;
    return { isPlaying: this.isPlaying, currentTime: this.playbackTime, totalTime, progress: totalTime > 0 ? this.playbackTime / totalTime : 0, currentFrameIndex: this.currentFrameIndex };
  }

  public dispose(): void {
    if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
    this.material.dispose();
  }
}