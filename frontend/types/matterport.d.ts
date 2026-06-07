/* Minimal type declarations for the Matterport SDK Bundle (showcase-sdk). */

interface MatterportVector3 {
  x: number;
  y: number;
  z: number;
}

interface MatterportColor {
  r: number;
  g: number;
  b: number;
}

interface MattertagDescriptor {
  label: string;
  description?: string;
  anchorPosition: MatterportVector3;
  stemVector: MatterportVector3;
  color?: MatterportColor;
  iconSrc?: string;
  stemVisible?: boolean;
  floorIndex?: number;
}

interface MatterportIntersection {
  position: MatterportVector3;
  normal: MatterportVector3;
  floorIndex?: number;
}

interface MatterportSubscription {
  cancel: () => void;
}

interface MatterportObservable<T> {
  subscribe(callback: (data: T) => void): MatterportSubscription;
}

interface MatterportMattertag {
  Event: {
    CLICK: string;
    HOVER: string;
    LINK_OPEN: string;
  };
  Transition: {
    FLY: string;
    INSTANT: string;
  };
  add(descriptors: MattertagDescriptor[]): Promise<string[]>;
  remove(tagId: string): Promise<void>;
  editPosition(tagId: string, options: { anchorPosition: MatterportVector3; stemVector: MatterportVector3; floorIndex?: number }): Promise<void>;
  editColor(tagId: string, color: MatterportColor): Promise<void>;
  getData(): Promise<Array<MattertagDescriptor & { sid: string }>>;
  navigateToTag(tagId: string, transition: string): Promise<void>;
}

interface MatterportPointer {
  intersection: MatterportObservable<MatterportIntersection>;
}

interface MatterportCamera {
  pose: MatterportObservable<{
    position: MatterportVector3;
    rotation: MatterportVector3;
    sweep: string;
    mode: string;
  }>;
}

interface MpSdk {
  Mattertag: MatterportMattertag;
  Pointer: MatterportPointer;
  Camera: MatterportCamera;
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
}

interface MatterportSDKConnect {
  connect(iframe: HTMLIFrameElement, key: string, version?: string): Promise<MpSdk>;
}

declare global {
  interface Window {
    MP_SDK?: MatterportSDKConnect;
  }
}

export type {
  MpSdk,
  MatterportVector3,
  MatterportColor,
  MattertagDescriptor,
  MatterportIntersection,
  MatterportSubscription,
  MatterportObservable,
  MatterportMattertag,
  MatterportPointer,
  MatterportCamera,
};
