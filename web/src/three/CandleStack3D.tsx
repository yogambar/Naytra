import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneShell } from './SceneShell';
import { CandleStackFallback } from './Fallbacks';

const CandleStickItem: React.FC<{
  position: [number, number, number];
  height: number;
  isUp: boolean;
  phase: number;
}> = ({ position, height, isUp, phase }) => {
  const meshRef = useRef<THREE.Group>(null);
  const color = isUp ? '#0B7A5A' : '#C43232';

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      meshRef.current.position.y = position[1] + Math.sin(t * 1.5 + phase) * 0.08;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Top Wick */}
      <mesh position={[0, height / 2 + 0.35, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.7, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.35, height, 0.35]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Bottom Wick */}
      <mesh position={[0, -height / 2 - 0.35, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.7, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
    </group>
  );
};

const CandleStackMesh: React.FC = () => {
  const stackRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (stackRef.current) {
      const t = state.clock.getElapsedTime();
      stackRef.current.rotation.y = Math.sin(t * 0.5) * 0.15;
    }
  });

  return (
    <group ref={stackRef} position={[0, 0, 0]}>
      <CandleStickItem position={[-1.2, -0.1, 0]} height={0.9} isUp={true} phase={0} />
      <CandleStickItem position={[-0.6, 0.3, 0.2]} height={1.3} isUp={true} phase={1} />
      <CandleStickItem position={[0, 0.1, -0.1]} height={1.6} isUp={false} phase={2} />
      <CandleStickItem position={[0.6, -0.2, 0.1]} height={1.1} isUp={false} phase={3} />
      <CandleStickItem position={[1.2, 0.2, 0]} height={1.4} isUp={true} phase={4} />
    </group>
  );
};

export const CandleStack3D: React.FC<{ size?: number; className?: string }> = ({ size = 200, className = '' }) => {
  return (
    <SceneShell
      accessibleLabel="Stack of Japanese Candlesticks in 3D"
      fallback={<CandleStackFallback size={size} />}
      width={size}
      height={size}
      className={className}
    >
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.9} />
        {/* Top-left key light */}
        <directionalLight position={[-4, 5, 4]} intensity={1.8} />
        <pointLight position={[2, -2, 2]} intensity={0.4} />
        <CandleStackMesh />
      </Canvas>
    </SceneShell>
  );
};
