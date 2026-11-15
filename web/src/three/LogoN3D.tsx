import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneShell } from './SceneShell';
import { LogoNFallback } from './Fallbacks';

const LogoNMesh: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating motion
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.15;
      groupRef.current.rotation.y = Math.sin(t * 0.8) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={0.85}>
      {/* Left Candlestick (Green/Up - Bullish) */}
      <group position={[-1.2, 0, 0]}>
        {/* Upper wick */}
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 16]} />
          <meshStandardMaterial color="#0B7A5A" roughness={0.3} metalness={0.2} />
        </mesh>
        {/* Body */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.55, 1.6, 0.55]} />
          <meshStandardMaterial color="#0B7A5A" roughness={0.3} metalness={0.2} />
        </mesh>
        {/* Lower wick */}
        <mesh position={[0, -1.0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 16]} />
          <meshStandardMaterial color="#0B7A5A" roughness={0.3} metalness={0.2} />
        </mesh>
      </group>

      {/* Right Candlestick (Red/Down - Bearish) */}
      <group position={[1.2, 0, 0]}>
        {/* Upper wick */}
        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 16]} />
          <meshStandardMaterial color="#C43232" roughness={0.3} metalness={0.2} />
        </mesh>
        {/* Body */}
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.55, 1.6, 0.55]} />
          <meshStandardMaterial color="#C43232" roughness={0.3} metalness={0.2} />
        </mesh>
        {/* Lower wick */}
        <mesh position={[0, -1.4, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 16]} />
          <meshStandardMaterial color="#C43232" roughness={0.3} metalness={0.2} />
        </mesh>
      </group>

      {/* Diagonal Bar (Marigold - forming the 'N') */}
      <mesh position={[0, 0, 0.05]} rotation={[0, 0, -0.72]}>
        <boxGeometry args={[0.35, 2.7, 0.35]} />
        <meshStandardMaterial color="#F2A93B" roughness={0.25} metalness={0.5} />
      </mesh>
    </group>
  );
};

export const LogoN3D: React.FC<{ size?: number; className?: string }> = ({ size = 200, className = '' }) => {
  return (
    <SceneShell
      accessibleLabel="Naytra Logo: Candlestick N mark in 3D"
      fallback={<LogoNFallback size={size} />}
      width={size}
      height={size}
      className={className}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.9} />
        {/* Light from top-left consistent with Depth System */}
        <directionalLight position={[-5, 5, 4]} intensity={1.8} />
        <pointLight position={[2, -2, 3]} intensity={0.4} />
        <LogoNMesh />
      </Canvas>
    </SceneShell>
  );
};
