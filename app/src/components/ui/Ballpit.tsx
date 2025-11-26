import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface BallpitProps {
  className?: string;
  followCursor?: boolean;
  count?: number;
  colors?: number[];
  ambientColor?: number;
  ambientIntensity?: number;
  lightIntensity?: number;
  minSize?: number;
  maxSize?: number;
  size0?: number;
  gravity?: number;
  friction?: number;
  wallBounce?: number;
  maxVelocity?: number;
  materialParams?: {
    metalness?: number;
    roughness?: number;
    clearcoat?: number;
    clearcoatRoughness?: number;
  };
}

interface BallpitConfig {
  count: number;
  colors: number[];
  ambientColor: number;
  ambientIntensity: number;
  lightIntensity: number;
  materialParams: {
    metalness: number;
    roughness: number;
    clearcoat: number;
    clearcoatRoughness: number;
  };
  minSize: number;
  maxSize: number;
  size0: number;
  gravity: number;
  friction: number;
  wallBounce: number;
  maxVelocity: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  controlSphere0: boolean;
  followCursor: boolean;
}

const defaultConfig: BallpitConfig = {
  count: 200,
  colors: [0xf97316, 0xea580c, 0xfb923c],
  ambientColor: 0xffffff,
  ambientIntensity: 1,
  lightIntensity: 200,
  materialParams: {
    metalness: 0.5,
    roughness: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0.15
  },
  minSize: 0.5,
  maxSize: 1,
  size0: 1,
  gravity: 0.5,
  friction: 0.9975,
  wallBounce: 0.95,
  maxVelocity: 0.15,
  maxX: 5,
  maxY: 5,
  maxZ: 2,
  controlSphere0: false,
  followCursor: true
};

class Physics {
  config: BallpitConfig;
  positionData: Float32Array;
  velocityData: Float32Array;
  sizeData: Float32Array;
  center: THREE.Vector3;

  constructor(config: BallpitConfig) {
    this.config = config;
    this.positionData = new Float32Array(3 * config.count).fill(0);
    this.velocityData = new Float32Array(3 * config.count).fill(0);
    this.sizeData = new Float32Array(config.count).fill(1);
    this.center = new THREE.Vector3();
    this.initPositions();
    this.setSizes();
  }

  initPositions() {
    const { config, positionData } = this;
    this.center.toArray(positionData, 0);
    for (let i = 1; i < config.count; i++) {
      const idx = 3 * i;
      positionData[idx] = THREE.MathUtils.randFloatSpread(2 * config.maxX);
      positionData[idx + 1] = THREE.MathUtils.randFloatSpread(2 * config.maxY);
      positionData[idx + 2] = THREE.MathUtils.randFloatSpread(2 * config.maxZ);
    }
  }

  setSizes() {
    const { config, sizeData } = this;
    sizeData[0] = config.size0;
    for (let i = 1; i < config.count; i++) {
      sizeData[i] = THREE.MathUtils.randFloat(config.minSize, config.maxSize);
    }
  }

  update(delta: number) {
    const { config, center, positionData, sizeData, velocityData } = this;
    const tempPos = new THREE.Vector3();
    const tempVel = new THREE.Vector3();
    const otherPos = new THREE.Vector3();
    const otherVel = new THREE.Vector3();
    const diff = new THREE.Vector3();
    const centerPos = new THREE.Vector3();

    let startIdx = 0;
    if (config.controlSphere0) {
      startIdx = 1;
      centerPos.fromArray(positionData, 0);
      centerPos.lerp(center, 0.1).toArray(positionData, 0);
      velocityData[0] = 0;
      velocityData[1] = 0;
      velocityData[2] = 0;
    }

    // Apply gravity and friction
    for (let i = startIdx; i < config.count; i++) {
      const base = 3 * i;
      tempPos.fromArray(positionData, base);
      tempVel.fromArray(velocityData, base);
      tempVel.y -= delta * config.gravity * sizeData[i];
      tempVel.multiplyScalar(config.friction);
      tempVel.clampLength(0, config.maxVelocity);
      tempPos.add(tempVel);
      tempPos.toArray(positionData, base);
      tempVel.toArray(velocityData, base);
    }

    // Collision detection
    for (let i = startIdx; i < config.count; i++) {
      const base = 3 * i;
      tempPos.fromArray(positionData, base);
      tempVel.fromArray(velocityData, base);
      const radius = sizeData[i];

      for (let j = i + 1; j < config.count; j++) {
        const otherBase = 3 * j;
        otherPos.fromArray(positionData, otherBase);
        otherVel.fromArray(velocityData, otherBase);
        const otherRadius = sizeData[j];

        diff.copy(otherPos).sub(tempPos);
        const dist = diff.length();
        const sumRadius = radius + otherRadius;

        if (dist < sumRadius) {
          const overlap = sumRadius - dist;
          const pushDir = diff.normalize().multiplyScalar(0.5 * overlap);
          
          tempPos.sub(pushDir);
          tempVel.sub(pushDir.clone().multiplyScalar(Math.max(tempVel.length(), 1)));
          tempPos.toArray(positionData, base);
          tempVel.toArray(velocityData, base);

          otherPos.add(pushDir);
          otherVel.add(pushDir.clone().multiplyScalar(Math.max(otherVel.length(), 1)));
          otherPos.toArray(positionData, otherBase);
          otherVel.toArray(velocityData, otherBase);
        }
      }

      // Collision with control sphere
      if (config.controlSphere0) {
        centerPos.fromArray(positionData, 0);
        diff.copy(centerPos).sub(tempPos);
        const dist = diff.length();
        const sumRadius0 = radius + sizeData[0];
        if (dist < sumRadius0) {
          const pushAmount = sumRadius0 - dist;
          const pushDir = diff.normalize().multiplyScalar(pushAmount);
          tempPos.sub(pushDir);
          tempVel.sub(pushDir.clone().multiplyScalar(Math.max(tempVel.length(), 2)));
        }
      }

      // Wall collision
      if (Math.abs(tempPos.x) + radius > config.maxX) {
        tempPos.x = Math.sign(tempPos.x) * (config.maxX - radius);
        tempVel.x = -tempVel.x * config.wallBounce;
      }

      if (config.gravity === 0) {
        if (Math.abs(tempPos.y) + radius > config.maxY) {
          tempPos.y = Math.sign(tempPos.y) * (config.maxY - radius);
          tempVel.y = -tempVel.y * config.wallBounce;
        }
      } else if (tempPos.y - radius < -config.maxY) {
        tempPos.y = -config.maxY + radius;
        tempVel.y = -tempVel.y * config.wallBounce;
      }

      const maxBoundary = Math.max(config.maxZ, config.maxSize);
      if (Math.abs(tempPos.z) + radius > maxBoundary) {
        tempPos.z = Math.sign(tempPos.z) * (config.maxZ - radius);
        tempVel.z = -tempVel.z * config.wallBounce;
      }

      tempPos.toArray(positionData, base);
      tempVel.toArray(velocityData, base);
    }
  }
}

const Ballpit: React.FC<BallpitProps> = ({
  className = '',
  followCursor = true,
  count = 200,
  colors = [0xf97316, 0xea580c, 0xfb923c],
  ambientColor = 0xffffff,
  ambientIntensity = 1,
  lightIntensity = 200,
  minSize = 0.5,
  maxSize = 1,
  size0 = 1,
  gravity = 0.5,
  friction = 0.9975,
  wallBounce = 0.95,
  maxVelocity = 0.15,
  materialParams = {
    metalness: 0.5,
    roughness: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0.15
  }
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Store initial config in a ref to prevent re-initialization on re-renders
  const configRef = useRef<BallpitConfig | null>(null);
  
  // Memoize the initial config - only compute once on mount
  const initialConfig = useMemo(() => ({
    ...defaultConfig,
    count,
    colors,
    ambientColor,
    ambientIntensity,
    lightIntensity,
    minSize,
    maxSize,
    size0,
    gravity,
    friction,
    wallBounce,
    maxVelocity,
    followCursor,
    materialParams: {
      metalness: materialParams.metalness ?? 0.5,
      roughness: materialParams.roughness ?? 0.5,
      clearcoat: materialParams.clearcoat ?? 1,
      clearcoatRoughness: materialParams.clearcoatRoughness ?? 0.15
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []); // Empty deps - only compute once on mount

  useEffect(() => {
    const container = containerRef.current;
    if (!container || initializedRef.current) return;
    
    // Wait for container to have dimensions
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // Try again after a short delay
      const timeout = setTimeout(() => {
        initializedRef.current = false;
        container.dispatchEvent(new Event('resize'));
      }, 100);
      return () => clearTimeout(timeout);
    }
    
    initializedRef.current = true;

    // Use the memoized initial config
    const config: BallpitConfig = initialConfig;
    configRef.current = config;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    // Setup scene
    const scene = new THREE.Scene();

    // Setup camera
    const camera = new THREE.PerspectiveCamera(50, rect.width / rect.height, 0.1, 100);
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);

    // Setup environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;

    // Setup geometry and material
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhysicalMaterial({
      envMap: envTexture,
      metalness: config.materialParams.metalness,
      roughness: config.materialParams.roughness,
      clearcoat: config.materialParams.clearcoat,
      clearcoatRoughness: config.materialParams.clearcoatRoughness
    });

    // Setup instanced mesh
    const mesh = new THREE.InstancedMesh(geometry, material, config.count);
    scene.add(mesh);

    // Setup colors
    if (config.colors.length > 1) {
      const colorLerp = (t: number): THREE.Color => {
        const scaled = Math.max(0, Math.min(1, t)) * (config.colors.length - 1);
        const idx = Math.floor(scaled);
        const frac = scaled - idx;
        const startColor = new THREE.Color(config.colors[idx]);
        if (idx >= config.colors.length - 1) return startColor;
        const endColor = new THREE.Color(config.colors[idx + 1]);
        return startColor.lerp(endColor, frac);
      };
      for (let i = 0; i < config.count; i++) {
        mesh.setColorAt(i, colorLerp(i / config.count));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // Setup lights
    const ambientLight = new THREE.AmbientLight(config.ambientColor, config.ambientIntensity);
    scene.add(ambientLight);

    const light = new THREE.PointLight(config.colors[0], config.lightIntensity);
    scene.add(light);

    // Setup physics
    const physics = new Physics(config);

    // Initial resize
    const resize = () => {
      const newRect = container.getBoundingClientRect();
      if (newRect.width === 0 || newRect.height === 0) return;
      
      renderer.setSize(newRect.width, newRect.height);
      camera.aspect = newRect.width / newRect.height;
      
      // Adjust FOV for aspect ratio
      const maxAspect = 1.5;
      if (camera.aspect > maxAspect) {
        const targetFov = 50;
        const factor = Math.tan(THREE.MathUtils.degToRad(targetFov / 2)) / (camera.aspect / maxAspect);
        camera.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(factor));
      } else {
        camera.fov = 50;
      }
      
      camera.updateProjectionMatrix();
      
      // Calculate world size
      const fov = (camera.fov * Math.PI) / 180;
      const wHeight = 2 * Math.tan(fov / 2) * camera.position.length();
      const wWidth = wHeight * camera.aspect;
      
      physics.config.maxX = wWidth / 2;
      physics.config.maxY = wHeight / 2;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    // Mouse/touch handlers
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();

    const onPointerMove = (e: PointerEvent) => {
      const newRect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - newRect.left) / newRect.width) * 2 - 1;
      mouse.y = -((e.clientY - newRect.top) / newRect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      camera.getWorldDirection(plane.normal);
      raycaster.ray.intersectPlane(plane, intersectPoint);
      
      physics.center.copy(intersectPoint);
      physics.config.controlSphere0 = true;
    };

    const onPointerLeave = () => {
      physics.config.controlSphere0 = false;
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);
    container.style.touchAction = 'none';

    // Animation loop
    const clock = new THREE.Clock();
    const dummy = new THREE.Object3D();
    let rafId: number;
    
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      physics.update(delta);
      
      for (let i = 0; i < config.count; i++) {
        dummy.position.fromArray(physics.positionData, 3 * i);
        
        if (i === 0 && !config.followCursor) {
          dummy.scale.setScalar(0);
        } else {
          dummy.scale.setScalar(physics.sizeData[i]);
        }
        
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        
        if (i === 0) {
          light.position.copy(dummy.position);
        }
      }
      
      mesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    };

    clock.start();
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      resizeObserver.disconnect();
      
      geometry.dispose();
      material.dispose();
      envTexture.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      initializedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConfig]); // Only depend on initialConfig which is memoized once

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'absolute',
        inset: 0,
        overflow: 'hidden'
      }} 
    />
  );
};

export default Ballpit;
