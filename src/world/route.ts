export const ROUTE_LENGTH = 6000;
export function roadX(s: number): number {
  return 70 * Math.sin(s / 390) + 28 * Math.sin(s / 170) + 0.055 * s;
}
export function roadHeading(s: number): number {
  return -Math.atan(70 / 390 * Math.cos(s / 390) + 28 / 170 * Math.cos(s / 170) + 0.055);
}
export function roadOffset(x: number, z: number): number { return x - roadX(-z); }
export const STAGES = [
  { name: 'The golden coast', region: 'PACIFIC COAST HIGHWAY', start: 0, end: 1800, limit: 100, gold: 58, silver: 75, subtitle: 'Salt air. Open road. A fresh start.', landmark: 'PELICAN POINT' },
  { name: 'Into the redwoods', region: 'CYPRESS RIDGE', start: 1850, end: 3850, limit: 108, gold: 65, silver: 82, subtitle: 'Find your rhythm through the sweeping bends.', landmark: 'CYPRESS RIDGE' },
  { name: 'Chasing the horizon', region: 'SUNSET HEADLANDS', start: 3900, end: 5900, limit: 103, gold: 62, silver: 80, subtitle: 'One last drive into the fading light.', landmark: 'HORIZON BAY' },
] as const;

export const EXPEDITION = {
  name: 'The Pacific Grand Tour', region: 'COAST / REDWOODS / HEADLANDS',
  start: 0, end: 5900, limit: 240, gold: 175, silver: 205,
  subtitle: 'One road. Three regions. One uninterrupted drive.', landmark: 'HORIZON BAY',
} as const;

/** Shared scenery anchors keep visitors beside the matching buildings and stops. */
export const ROADSIDE_SITES=Array.from({length:7},(_,index)=>({index,s:250+index*870,kind:index%2?"lodge":"station"}));
export const OVERLOOK_SITES=[660,1510,4300,5650] as const;
