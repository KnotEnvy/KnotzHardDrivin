/** Shared calibration for the live coast and model-review lighting. */
export const LIGHTING={
 exposure:.88,
 sun:2.15,
 skyFill:1.05,
 cloudFill:.18,
 reflections:.78,
 reflectionVariation:.20,
 skyBrightness:.90,
 bloom:{strength:.08,threshold:1.7,radius:.45},
 studio:{key:2.1,fill:.50,skyFill:.90,reflections:.70},
} as const;
