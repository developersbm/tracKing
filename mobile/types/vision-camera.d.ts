// Minimal module declarations for packages that provide native bindings
// These declarations silence TS2307 until the native packages are installed
// or until proper type definitions are added.

declare module 'react-native-vision-camera' {
  // Basic helpers used in the app; shape is `any` for now.
  export function useCameraDevice(position?: string): any;
  export function useCameraDevices(position?: string): any;
  export default any;
}

declare module 'react-native-vision-camera-v3-pose-detection' {
  import { ComponentType } from 'react';
  // Export a Camera component (props typed as any for now)
  export const Camera: ComponentType<any>;
  export default Camera;
}

// If you later install real types, remove or replace this file.
