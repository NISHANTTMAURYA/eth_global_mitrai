'use client';
import { createContext, useRef, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { View } from '@react-three/drei';
export const GalleryContext = createContext(false);
function ClearFrame() {
  useFrame(({ gl }) => {
    gl.setScissorTest(false);
    gl.clear(true, true, true);
  }, -100);
  return null;
}
/** One GPU context for all cards; View renders only each visible scissor rectangle. */
export default function GalleryRenderer({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null!);
  return (
    <GalleryContext.Provider value={true}>
      <div ref={root} style={{ position: 'relative' }}>
        {children}
        <Canvas
          eventSource={root}
          dpr={[1, 2]}
          camera={{ position: [0, 0, 6.4], fov: 35 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: -1,
            opacity: 0,
          }}
        >
          <ClearFrame />
          <View.Port />
        </Canvas>
      </div>
    </GalleryContext.Provider>
  );
}
