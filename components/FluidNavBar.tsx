
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, RoundedBox, Html, Environment } from '@react-three/drei';
import { easing } from 'maath';
import * as THREE from 'three';

interface FluidNavBarProps {
  items: React.ReactNode[];
}

// The Glass Bar Geometry and Material
const GlassBar = ({ children }: { children?: React.ReactNode }) => {
  const mesh = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  // Gentle floating animation
  useFrame((state, delta) => {
    if (mesh.current) {
        // Slight rotation following pointer for interactivity
        const x = (state.pointer.x * viewport.width) / 2;
        const y = (state.pointer.y * viewport.height) / 2;
        
        // Damp the movement for smoothness
        easing.damp3(mesh.current.position, [0, 0, 0], 0.1, delta);
        easing.dampE(mesh.current.rotation, [y / 20, x / 20, 0], 0.1, delta);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* The Glass Geometry */}
      <RoundedBox
        ref={mesh}
        args={[3.8, 0.9, 0.5]} // Width, Height, Depth relative to viewport
        radius={0.45} // High radius for pill shape
        smoothness={4}
      >
        <MeshTransmissionMaterial
          backside
          samples={4} // Reduced for mobile performance
          resolution={512} // Reduced for mobile performance
          transmission={0.95}
          roughness={0.1}
          thickness={0.5}
          ior={1.2} // Index of Refraction
          chromaticAberration={0.06}
          anisotropy={0.1}
          distortion={0.1}
          distortionScale={0.3}
          temporalDistortion={0.5}
          clearcoat={1}
          attenuationDistance={0.5}
          attenuationColor="#ffffff"
          color="#ffffff"
        />
      </RoundedBox>

      {/* Render HTML Content inside the 3D scene so it moves with the glass conceptually, 
          though here we place it slightly in front to ensure interactivity */}
      <Html
        position={[0, 0, 0.3]} // Slightly in front of glass
        transform // 3D transform matches scene
        center
        style={{ width: '380px', height: '90px' }}
        pointerEvents="none" // Let wrapper handle events
      >
        <div className="w-full h-full flex items-center justify-between px-6 pointer-events-auto">
            {children}
        </div>
      </Html>
    </group>
  );
};

// Lighting setup to make the glass look good
const SceneLighting = () => (
  <>
    <Environment preset="city" />
    <ambientLight intensity={0.5} />
    <pointLight position={[10, 10, 10]} intensity={1} />
    <pointLight position={[-10, -10, -10]} intensity={0.5} />
  </>
);

const FluidNavBar: React.FC<FluidNavBarProps> = ({ items }) => {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-[80] h-24 flex justify-center pointer-events-none">
      <div className="w-full max-w-md h-full pointer-events-auto">
        <Canvas 
            camera={{ position: [0, 0, 5], fov: 45 }} 
            gl={{ alpha: true, antialias: true }}
            dpr={[1, 2]} // Clamp pixel ratio for mobile performance
        >
          <SceneLighting />
          <GlassBar>
            {items}
          </GlassBar>
        </Canvas>
      </div>
    </div>
  );
};

export default FluidNavBar;
