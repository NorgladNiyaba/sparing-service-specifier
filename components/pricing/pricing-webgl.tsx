"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type FunnelSceneStage =
  | "intro"
  | "location"
  | "company"
  | "revenue"
  | "reveal"
  | "secure"
  | "welcome";

type SceneVariant = "background" | "hero" | "reveal" | "welcome";

type Palette = {
  mist: string;
  plane: string;
  line: string;
  accent: string;
  ribbonA: string;
  ribbonB: string;
  highlight: string;
};

const palettes: Record<SceneVariant, Palette> = {
  background: {
    mist: "#f6f8ff",
    plane: "#edf2ff",
    line: "#8fa4c3",
    accent: "#d61b17",
    ribbonA: "#ffd4c6",
    ribbonB: "#d9ddff",
    highlight: "#ffffff",
  },
  hero: {
    mist: "#f8fbff",
    plane: "#edf3ff",
    line: "#7890b4",
    accent: "#d61b17",
    ribbonA: "#ffc5bc",
    ribbonB: "#d6d8ff",
    highlight: "#ffffff",
  },
  reveal: {
    mist: "#fbfcff",
    plane: "#eef2ff",
    line: "#8397b7",
    accent: "#d61b17",
    ribbonA: "#ffcdc4",
    ribbonB: "#d9dcff",
    highlight: "#ffffff",
  },
  welcome: {
    mist: "#fbfcff",
    plane: "#f2f5fb",
    line: "#91a0b6",
    accent: "#c85a4f",
    ribbonA: "#f7d6ce",
    ribbonB: "#e3e3ff",
    highlight: "#ffffff",
  },
};

function buildSignal(seed: number, spread: number, amplitude: number, depth: number) {
  const pointCount = 48;
  const points = new Float32Array(pointCount * 3);

  for (let index = 0; index < pointCount; index += 1) {
    const progress = index / (pointCount - 1);
    const x = THREE.MathUtils.lerp(-spread, spread, progress);
    const y =
      Math.sin(progress * Math.PI * (1.8 + seed * 0.2)) * amplitude +
      Math.cos(progress * Math.PI * (3.2 + seed * 0.14)) * amplitude * 0.24 +
      (seed - 1.5) * 0.35;
    const z = depth + Math.sin(progress * Math.PI * 1.4 + seed) * 0.1;

    points[index * 3] = x;
    points[index * 3 + 1] = y;
    points[index * 3 + 2] = z;
  }

  return points;
}

function buildRibbonCurve(seed: number, spread: number, amplitude: number, depth: number) {
  const points: THREE.Vector3[] = [];

  for (let index = 0; index <= 28; index += 1) {
    const progress = index / 28;
    const x = THREE.MathUtils.lerp(-spread, spread, progress);
    const y =
      Math.sin(progress * Math.PI * (1.25 + seed * 0.18)) * amplitude +
      Math.cos(progress * Math.PI * (1.9 + seed * 0.14)) * amplitude * 0.48 +
      (seed - 1.2) * 0.44;
    const z = depth + Math.sin(progress * Math.PI * 1.05 + seed) * 0.2;

    points.push(new THREE.Vector3(x, y, z));
  }

  return new THREE.CatmullRomCurve3(points);
}

function SceneContent({
  stage,
  variant,
  intensity,
}: {
  stage: FunnelSceneStage;
  variant: SceneVariant;
  intensity: number;
}) {
  const root = useRef<THREE.Group>(null);
  const planes = useRef<THREE.Group>(null);
  const signals = useRef<THREE.Group>(null);
  const ribbons = useRef<THREE.Group>(null);
  const palette = palettes[variant];

  const stageFactor =
    stage === "intro" ? 1 :
    stage === "reveal" ? 1.08 :
    stage === "welcome" ? 0.72 :
    stage === "secure" ? 0.34 :
    0.48;

  const targetIntensity = intensity * stageFactor;
  const scrollProgress = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const height = Math.max(window.innerHeight, 1);
      scrollProgress.current = Math.min(window.scrollY / height, 1.5);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signalData = useMemo(
    () => [
      buildSignal(0.4, 5.2, 0.18, -0.22),
      buildSignal(1.5, 4.8, 0.24, 0.06),
      buildSignal(2.8, 4.4, 0.18, 0.32),
    ],
    [],
  );

  const ribbonCurves = useMemo(
    () => [
      buildRibbonCurve(0.6, 4.8, 0.8, -0.12),
      buildRibbonCurve(1.7, 4.5, 0.92, 0.18),
    ],
    [],
  );

  useFrame((state, delta) => {
    if (!root.current || !planes.current || !signals.current || !ribbons.current) {
      return;
    }

    const time = state.clock.getElapsedTime();
    const pointerX = state.pointer.x * 0.12;
    const pointerY = state.pointer.y * 0.08;
    const scrollLift = scrollProgress.current * 0.08;

    root.current.rotation.z = THREE.MathUtils.damp(root.current.rotation.z, pointerX * 0.08, 3, delta);
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, -pointerY * 0.06, 3, delta);
    root.current.position.y = THREE.MathUtils.damp(root.current.position.y, scrollLift + pointerY * 0.18, 3.2, delta);

    planes.current.children.forEach((child, index) => {
      child.rotation.z = Math.sin(time * 0.1 + index) * 0.03;
      child.position.x = Math.sin(time * 0.08 + index * 0.6) * 0.12 + pointerX * (index + 1) * 0.32;
      child.position.y = Math.cos(time * 0.11 + index * 0.5) * 0.09 + pointerY * (index + 1) * 0.16;
    });

    signals.current.rotation.z = THREE.MathUtils.damp(signals.current.rotation.z, pointerX * 0.06, 2.2, delta);
    signals.current.position.x = THREE.MathUtils.damp(signals.current.position.x, pointerX * 0.35, 2.8, delta);
    signals.current.position.y = Math.sin(time * 0.08) * 0.06 + pointerY * 0.24;

    ribbons.current.rotation.z = THREE.MathUtils.damp(ribbons.current.rotation.z, pointerX * 0.1, 2.2, delta);
    ribbons.current.position.x = THREE.MathUtils.damp(ribbons.current.position.x, pointerX * 0.3, 2.4, delta);
    ribbons.current.position.y = Math.sin(time * 0.06) * 0.08 + pointerY * 0.18;
  });

  return (
    <>
      <fog attach="fog" args={["#ffffff", 8.5, 16]} />
      <color attach="background" args={["#ffffff"]} />
      <ambientLight intensity={1.15 * targetIntensity} color={palette.highlight} />
      <directionalLight
        position={[3.5, 2.8, 5.8]}
        intensity={1.25 * targetIntensity}
        color={palette.highlight}
      />
      <pointLight
        position={[-4.6, 1.2, 3.8]}
        intensity={0.52 * targetIntensity}
        color={palette.accent}
      />
      <pointLight
        position={[4.2, -1.4, 4.4]}
        intensity={0.64 * targetIntensity}
        color={palette.mist}
      />

      <group ref={root} position={[0, 0, 0]}>
        <group ref={planes}>
          <mesh position={[-1.1, 0.2, -1.4]} rotation={[-0.22, 0.08, -0.16]}>
            <planeGeometry args={[5.6, 3.5, 1, 1]} />
            <meshPhysicalMaterial
              color={palette.mist}
              transparent
              opacity={0.24 * targetIntensity}
              roughness={0.52}
              metalness={0}
              clearcoat={1}
              clearcoatRoughness={0.48}
              transmission={0.88}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[1.5, -0.4, -0.8]} rotation={[-0.08, -0.12, 0.18]}>
            <planeGeometry args={[4.6, 2.9, 1, 1]} />
            <meshPhysicalMaterial
              color={palette.highlight}
              transparent
              opacity={0.26 * targetIntensity}
              roughness={0.34}
              metalness={0}
              clearcoat={1}
              clearcoatRoughness={0.28}
              transmission={0.92}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0.75, 1.05, 0.1]} rotation={[-0.12, 0.18, -0.08]}>
            <planeGeometry args={[3.25, 1.95, 1, 1]} />
            <meshPhysicalMaterial
              color={palette.plane}
              transparent
              opacity={0.3 * targetIntensity}
              roughness={0.46}
              metalness={0}
              clearcoat={0.92}
              clearcoatRoughness={0.38}
              transmission={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        <group ref={ribbons} position={[0.65, -0.15, 0.3]} rotation={[0.12, -0.4, 0.3]}>
          {ribbonCurves.map((curve, index) => (
            <mesh key={`ribbon-${index}`}>
              <tubeGeometry args={[curve, 160, index === 0 ? 0.18 : 0.12, 20, false]} />
              <meshPhysicalMaterial
                color={index === 0 ? palette.ribbonA : palette.ribbonB}
                transparent
                opacity={(index === 0 ? 0.42 : 0.36) * targetIntensity}
                roughness={0.22}
                metalness={0}
                clearcoat={1}
                clearcoatRoughness={0.12}
                transmission={0.96}
                thickness={1.1}
              />
            </mesh>
          ))}
        </group>

        <group ref={signals} position={[-0.3, 0.08, 0.95]}>
          {signalData.map((positions, index) => (
            <line key={`signal-${index}`}>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
              </bufferGeometry>
              <lineBasicMaterial
                color={index === 1 ? palette.accent : palette.line}
                transparent
                opacity={(index === 1 ? 0.18 : 0.11) * targetIntensity}
              />
            </line>
          ))}
        </group>
      </group>
    </>
  );
}

export function AmbientSceneLayer({
  stage,
  variant,
  className = "",
  intensity = 1,
}: {
  stage: FunnelSceneStage;
  variant: SceneVariant;
  className?: string;
  intensity?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      setCanRender(false);
      return;
    }

    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl", { alpha: true, antialias: true }) ||
      canvas.getContext("experimental-webgl");

    setCanRender(Boolean(gl));
  }, [prefersReducedMotion]);

  if (!canRender) {
    return null;
  }

  return (
    <div aria-hidden="true" className={`scene-layer ${className}`}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 7.2], fov: 32 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <SceneContent stage={stage} variant={variant} intensity={intensity} />
      </Canvas>
    </div>
  );
}
