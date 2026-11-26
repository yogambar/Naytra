import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneShell } from './SceneShell';
import { CoinVirtualFallback } from './Fallbacks';

const CoinMesh: React.FC = () => {
  const coinRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (coinRef.current) {
      const t = state.clock.getElapsedTime();
      // Gentle 360-degree rotation showing depth and coin face
      coinRef.current.rotation.y = t * 1.2;
      coinRef.current.position.y = Math.sin(t * 2) * 0.1;
      coinRef.current.rotation.x = Math.sin(t * 0.5) * 0.15;
    }
  });

  return (
    <group ref={coinRef}>
      {/* Outer Coin Disk */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.2, 48]} />
        <meshStandardMaterial
          color="#F2A93B"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* Raised Rim on Front Face */}
      <mesh position={[0, 0, 0.11]}>
        <ringGeometry args={[1.3, 1.45, 48]} />
        <meshStandardMaterial
          color="#D48A1E"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      {/* Raised Rim on Back Face */}
      <mesh position={[0, 0, -0.11]} rotation={[0, Math.PI, 0]}>
        <ringGeometry args={[1.3, 1.45, 48]} />
        <meshStandardMaterial
          color="#D48A1E"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      {/* Front Face "N" Mark (composed of three bars) */}
      <group position={[0, 0, 0.12]} scale={0.7}>
        <mesh position={[-0.45, 0, 0]}>
          <boxGeometry args={[0.18, 1.1, 0.04]} />
          <meshStandardMaterial color="#8B5205" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.45, 0, 0]}>
          <boxGeometry args={[0.18, 1.1, 0.04]} />
          <meshStandardMaterial color="#8B5205" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[0, 0, -0.68]}>
          <boxGeometry args={[0.18, 1.3, 0.04]} />
          <meshStandardMaterial color="#8B5205" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Back Face "NAYTRA" Emboss */}
      <group position={[0, 0, -0.12]} rotation={[0, Math.PI, 0]} scale={0.6}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 0.35, 0.04]} />
          <meshStandardMaterial color="#8B5205" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};

export const CoinVirtual3D: React.FC<{ size?: number; className?: string }> = ({ size = 200, className = '' }) => {
  return (
    <SceneShell
      accessibleLabel="Naytra Bonus Coin in 3D"
      fallback={<CoinVirtualFallback size={size} />}
      width={size}
      height={size}
      className={className}
    >
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        {/* Light from top-left */}
        <directionalLight position={[-4, 5, 4]} intensity={2.0} />
        <pointLight position={[3, -2, 3]} intensity={0.6} color="#FFF8E7" />
        <CoinMesh />
      </Canvas>
    </SceneShell>
  );
};
