import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Box, Cylinder, PerspectiveCamera, OrbitControls, Grid, Environment, ContactShadows, Html } from "@react-three/drei";
import * as THREE from "three";
import { RobotData } from "../types";

interface RobotArmProps {
  data: RobotData;
  position?: [number, number, number];
  scale?: number;
  label?: string;
}

const RobotArm: React.FC<RobotArmProps> = ({ data, position = [0, -1, 0], scale = 1, label }) => {
  // Refs for joints to animate smoothly
  const baseRef = useRef<THREE.Group>(null);
  const shoulderRef = useRef<THREE.Group>(null);
  const elbowRef = useRef<THREE.Group>(null);
  const wristPitchRef = useRef<THREE.Group>(null);
  const wristRollRef = useRef<THREE.Group>(null);
  const gripperLeftRef = useRef<THREE.Mesh>(null);
  const gripperRightRef = useRef<THREE.Mesh>(null);

  // Helper to convert degrees to radians
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  useFrame(() => {
    if (baseRef.current) baseRef.current.rotation.y = THREE.MathUtils.lerp(baseRef.current.rotation.y, degToRad(data.base), 0.1);
    if (shoulderRef.current) shoulderRef.current.rotation.z = THREE.MathUtils.lerp(shoulderRef.current.rotation.z, degToRad(data.shoulder - 90), 0.1);
    if (elbowRef.current) elbowRef.current.rotation.z = THREE.MathUtils.lerp(elbowRef.current.rotation.z, degToRad(data.elbow - 90), 0.1);
    if (wristPitchRef.current) wristPitchRef.current.rotation.z = THREE.MathUtils.lerp(wristPitchRef.current.rotation.z, degToRad(data.wrist_pitch), 0.1);
    if (wristRollRef.current) wristRollRef.current.rotation.x = THREE.MathUtils.lerp(wristRollRef.current.rotation.x, degToRad(data.wrist_roll), 0.1);
    
    // Gripper animation
    const gripPos = (data.gripper / 100) * 0.15;
    if (gripperLeftRef.current) gripperLeftRef.current.position.z = THREE.MathUtils.lerp(gripperLeftRef.current.position.z, 0.1 + gripPos, 0.1);
    if (gripperRightRef.current) gripperRightRef.current.position.z = THREE.MathUtils.lerp(gripperRightRef.current.position.z, -0.1 - gripPos, 0.1);
  });

  return (
    <group position={position} scale={scale}>
      {label && (
        <Html position={[0, 3, 0]} center>
          <div className="px-2 py-1 bg-white/90 backdrop-blur-md rounded border border-slate-200 text-[8px] font-mono text-slate-500 uppercase tracking-widest whitespace-nowrap shadow-sm">
            {label}
          </div>
        </Html>
      )}
      {/* Base Stand */}
      <Cylinder args={[0.8, 1, 0.2, 32]} position={[0, 0.1, 0]}>
        <meshStandardMaterial color={label?.includes('MASTER') ? "#222" : "#111"} metalness={0.8} roughness={0.2} />
      </Cylinder>

      {/* Base Rotation */}
      <group ref={baseRef}>
        <Cylinder args={[0.5, 0.5, 0.4, 32]} position={[0, 0.4, 0]}>
          <meshStandardMaterial color={label?.includes('MASTER') ? "#444" : "#222"} metalness={0.7} roughness={0.3} />
        </Cylinder>

        {/* Shoulder Joint */}
        <group ref={shoulderRef} position={[0, 0.6, 0]}>
          <Box args={[0.3, 2, 0.3]} position={[0, 1, 0]}>
            <meshStandardMaterial color={label?.includes('MASTER') ? "#f59e0b" : "#3b82f6"} metalness={0.5} roughness={0.5} opacity={label?.includes('MASTER') ? 1 : 0.8} transparent={!label?.includes('MASTER')} />
          </Box>

          {/* Elbow Joint */}
          <group ref={elbowRef} position={[0, 2, 0]}>
            <Box args={[0.25, 1.5, 0.25]} position={[0, 0.75, 0]}>
              <meshStandardMaterial color={label?.includes('MASTER') ? "#f59e0b" : "#3b82f6"} metalness={0.5} roughness={0.5} opacity={label?.includes('MASTER') ? 1 : 0.8} transparent={!label?.includes('MASTER')} />
            </Box>

            {/* Wrist Pitch */}
            <group ref={wristPitchRef} position={[0, 1.5, 0]}>
              <Cylinder args={[0.15, 0.15, 0.3, 16]} rotation={[0, 0, Math.PI / 2]}>
                <meshStandardMaterial color="#666" />
              </Cylinder>

              {/* Wrist Roll */}
              <group ref={wristRollRef} position={[0, 0.2, 0]}>
                <Cylinder args={[0.1, 0.1, 0.4, 16]} position={[0, 0.2, 0]}>
                  <meshStandardMaterial color="#333" />
                </Cylinder>

                {/* Gripper Base */}
                <group position={[0, 0.4, 0]}>
                  <Box args={[0.4, 0.1, 0.1]}>
                    <meshStandardMaterial color="#222" />
                  </Box>
                  
                  {/* Gripper Fingers */}
                  <Box ref={gripperLeftRef} args={[0.1, 0.3, 0.05]} position={[0.15, 0.2, 0.1]}>
                    <meshStandardMaterial color="#888" />
                  </Box>
                  <Box ref={gripperRightRef} args={[0.1, 0.3, 0.05]} position={[0.15, 0.2, -0.1]}>
                    <meshStandardMaterial color="#888" />
                  </Box>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

interface RobotSceneProps {
  data: RobotData;
  swarmCount: number;
}

export const RobotScene: React.FC<RobotSceneProps> = ({ data, swarmCount }) => {
  const replicas = Array.from({ length: swarmCount });

  return (
    <div className="w-full h-full bg-slate-200 rounded-xl overflow-hidden relative border border-slate-300 shadow-2xl">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur-md rounded-full border border-slate-200">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            data.source === 'mqtt' ? 'bg-emerald-500' : 
            data.source === 'manual' ? 'bg-red-500' : 'bg-amber-500'
          }`} />
          <span className="text-[10px] uppercase tracking-widest font-mono text-slate-700">
            {data.source === 'mqtt' ? 'Master Hardware Live' : 
             data.source === 'manual' ? 'Manual Override Active' : 'Simulation Mode'}
          </span>
        </div>
        {swarmCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50/80 backdrop-blur-md rounded-full border border-blue-200">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-mono text-blue-600">
              Swarm Active: {swarmCount} Replicas
            </span>
          </div>
        )}
      </div>
      
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={50} />
        <OrbitControls enablePan={true} minDistance={3} maxDistance={30} />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={1} />
        
        {/* Master Arm */}
        <RobotArm data={data} position={[0, -1, 0]} label="MASTER UNIT" />

        {/* Replicas */}
        {replicas.map((_, i) => {
          const row = Math.floor(i / 3) + 1;
          const col = (i % 3) - 1;
          const x = col * 4;
          const z = row * -4;
          return (
            <RobotArm 
              key={i} 
              data={data} 
              position={[x, -1, z]} 
              scale={0.8} 
              label={`REPLICA UNIT ${i + 1}`} 
            />
          );
        })}
        
        <Grid infiniteGrid fadeDistance={30} sectionColor="#ccc" cellColor="#ddd" />
        <Environment preset="city" />
        <ContactShadows opacity={0.4} scale={20} blur={2} far={4.5} />
      </Canvas>
    </div>
  );
};

