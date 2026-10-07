/** Shared paint choices for garage selection and cloned traffic bodies. */
export const VEHICLE_PAINTS=[
 {name:'Sunburst',color:0xf1a344},
 {name:'Sea glass',color:0xa9d5d2},
 {name:'Carmine',color:0xb62a27},
 {name:'Ivory',color:0xe8e2d4},
 {name:'Forest',color:0x476554},
 {name:'Pacific blue',color:0x34556a},
 {name:'Sky blue',color:0x83aaba},
 {name:'Graphite',color:0x45494b},
 {name:'Burgundy',color:0x793e4b},
 {name:'Coastal clay',color:0xa77b5b},
] as const;
/** Each family receives different colors as the fleet repeats, without extra cars. */
export function trafficPaint(index:number):number{
 return VEHICLE_PAINTS[(Math.floor(index/5)*3+index*2)%VEHICLE_PAINTS.length].color;
}
