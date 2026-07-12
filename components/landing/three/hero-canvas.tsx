"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type { Mesh } from "three";

// Hardcoded amber accent approximating the theme's --primary (oklch(85.2% .199 91.936)).
const AMBER = "#f2b53c";

function RotatingIcosahedron() {
  const solidRef = useRef<Mesh>(null);
  const wireRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (solidRef.current) {
      solidRef.current.rotation.x += delta * 0.12;
      solidRef.current.rotation.y += delta * 0.18;
    }
    if (wireRef.current) {
      wireRef.current.rotation.x -= delta * 0.05;
      wireRef.current.rotation.y -= delta * 0.08;
    }
  });

  return (
    <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.1} floatingRange={[-0.15, 0.15]}>
      <mesh ref={solidRef}>
        {/* radius 1.5, detail 1 -> low-poly (well under 50k triangles) */}
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial color={AMBER} roughness={0.25} metalness={0.55} flatShading />
      </mesh>
      <mesh ref={wireRef} scale={1.35}>
        <icosahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial color={AMBER} wireframe transparent opacity={0.25} />
      </mesh>
    </Float>
  );
}

/**
 * Pure R3F scene. Kept free of any viewport/reduced-motion logic so it can be
 * dynamically imported with ssr disabled from a client wrapper.
 */
export function HeroCanvas() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 5.5], fov: 42 }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[4, 4, 4]} intensity={1.4} color={AMBER} />
      <directionalLight position={[-3, 2, 2]} intensity={0.5} />
      <RotatingIcosahedron />
    </Canvas>
  );
}
