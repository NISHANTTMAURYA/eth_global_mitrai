'use client';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useAnimations } from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { VRMLoaderPlugin, type VRM } from '@pixiv/three-vrm';
import { Box3, Vector3, Group, Mesh, LoopOnce, MathUtils } from 'three';
import type { ModelId } from '@/lib/domain';
import { modelPath } from '@/lib/models';
type Props = {
  model: ModelId;
  speaking?: boolean;
  vowel?: number;
  gesture?: string;
  gestureKey?: number;
  interactive?: boolean;
  compact?: boolean;
  legacy?: boolean;
};
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        Your character is taking a moment.<small>3D needs a browser with WebGL.</small>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Character({
  model,
  speaking = false,
  vowel = 0,
  gesture = 'Idle',
  gestureKey = 0,
  legacy = false,
  loader,
  onReady,
}: Props & { loader: GLTFLoader; onReady: () => void }) {
  const path = modelPath(model);
  const gltf = useLoader(loader, path);
  useEffect(() => {
    onReady();
  }, [gltf, onReady]);
  const vrm = model === 'human' ? (gltf.userData.vrm as VRM) : undefined;
  const object = useMemo(() => (model === 'human' ? gltf.scene : clone(gltf.scene)), [gltf, model]);
  const group = useRef<Group>(null);
  const { actions } = useAnimations(gltf.animations, object);
  const time = useRef(0);
  const wavingUntil = useRef(0);
  const transform = useMemo(() => {
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = 3.1 / (size.y || 1);
    return {
      scale,
      position: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [
        number,
        number,
        number,
      ],
    };
  }, [object]);
  useEffect(() => {
    if (legacy) {
      Object.values(actions).forEach((a) => a?.stop());
      return;
    }
    const idle = actions[model === 'fox' ? 'Survey' : 'Idle'] || actions.idle;
    idle?.reset().fadeIn(0.3).play();
    return () => {
      Object.values(actions).forEach((a) => a?.stop());
    };
  }, [actions, model, legacy]);
  useEffect(() => {
    if (!gestureKey || legacy) return;
    wavingUntil.current = time.current + 2.5;
    const clip = actions[gesture];
    if (clip) {
      const idle = actions[model === 'fox' ? 'Survey' : 'Idle'] || actions.idle;
      idle?.fadeOut(0.25);
      clip.reset().setLoop(LoopOnce, 1);
      clip.clampWhenFinished = true;
      clip.fadeIn(0.25).play();
      const timeout = setTimeout(
        () => {
          clip.fadeOut(0.25);
          idle?.reset().fadeIn(0.25).play();
        },
        Math.max(1000, (clip.getClip().duration - 0.15) * 1000),
      );
      return () => clearTimeout(timeout);
    }
  }, [actions, gesture, gestureKey, legacy, model]);
  useFrame((state, delta) => {
    if (legacy) return;
    time.current += delta;
    const t = time.current;
    if (group.current && !legacy)
      group.current.rotation.y = Math.sin(t * 0.35) * 0.07 + state.pointer.x * 0.1;
    if (vrm) {
      const arm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
      const other = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
      const forearm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
      const head = vrm.humanoid.getNormalizedBoneNode('head');
      const hand = vrm.humanoid.getNormalizedBoneNode('leftHand');
      const chest = vrm.humanoid.getNormalizedBoneNode('chest');
      const wave = t < wavingUntil.current;
      if (hand) hand.rotation.z = wave ? Math.sin(t * 9) * 0.3 : 0;
      if (chest) chest.rotation.x = Math.sin(t * 1.8) * 0.01;
      if (arm) {
        arm.rotation.z = wave ? 0.2 : -1.12;
        arm.rotation.x = wave ? -0.7 : Math.sin(t) * 0.02;
      }
      if (other) other.rotation.z = 1.12;
      if (forearm) forearm.rotation.y = wave ? -1.2 : 0;
      if (head) {
        head.rotation.y = state.pointer.x * 0.16;
        head.rotation.x = Math.sin(t * 0.65) * 0.025;
        if (wave) head.rotation.z = Math.sin(t * 5) * 0.035;
      }
      const names = ['aa', 'ih', 'ou', 'ee', 'oh'];
      names.forEach((n, i) =>
        vrm.expressionManager?.setValue(
          n,
          MathUtils.damp(
            vrm.expressionManager?.getValue(n) || 0,
            speaking && i === vowel ? Math.sin(t * 23) * 0.12 + 0.55 : 0,
            18,
            delta,
          ),
        ),
      );
      vrm.expressionManager?.setValue('blink', Math.pow(Math.max(0, Math.sin(t * 0.65)), 24));
      vrm.update(Math.min(delta, 0.05));
    } else
      object.traverse((o) => {
        const mesh = o as Mesh;
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          for (const [name, i] of Object.entries(mesh.morphTargetDictionary)) {
            if (/v_(aa|ih|ou|ee|oh)$/.test(name)) {
              const active = name.endsWith(`v_${['aa', 'ih', 'ou', 'ee', 'oh'][vowel]}`);
              mesh.morphTargetInfluences[i] = MathUtils.damp(mesh.morphTargetInfluences[i], speaking && active ? 0.65 : 0, 18, delta);
            } else if (/blink$/.test(name)) {
              mesh.morphTargetInfluences[i] = Math.pow(Math.max(0, Math.sin(t * 0.65)), 24);
            }
          }
          const index = mesh.morphTargetDictionary.Surprised;
          if (index !== undefined)
            mesh.morphTargetInfluences[index] = MathUtils.damp(
              mesh.morphTargetInfluences[index],
              speaking ? 0.2 + Math.abs(Math.sin(t * 17)) * 0.5 : 0,
              14,
              delta,
            );
        }
      });
  });
  return (
    <group ref={group}>
      <group scale={transform.scale} position={transform.position}>
        <primitive object={object} />
      </group>
    </group>
  );
}
export default function CharacterStage(props: Props) {
  const loader = useMemo(
    () => new GLTFLoader().register((parser) => new VRMLoaderPlugin(parser)),
    [],
  );
  const [visible, setVisible] = useState(false);
  const [loadedModel, setLoadedModel] = useState<ModelId | null>(null);
  const markReady = useCallback(() => setLoadedModel(props.model), [props.model]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: '150px',
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`character-stage ${props.compact ? 'compact' : ''}`}
      aria-busy={visible && loadedModel !== props.model}
      aria-label={`Animated ${props.model === 'human' ? 'human' : props.model} character`}
    >
      <SceneBoundary>
        {visible && (
          <Canvas
            dpr={[1, 1.6]}
            camera={{ position: [0, 1.65, 6.4], fov: 35 }}
            gl={{ antialias: true, alpha: true }}
          >
            <ambientLight intensity={1.7} />
            <hemisphereLight args={['#fff8ec', '#d4c6ae', 1.7]} />
            <directionalLight position={[3, 5, 4]} intensity={3} />
            <directionalLight position={[-3, 2, -2]} intensity={1.3} />
            {/* DOM loading UI stays outside Canvas: Drei Html creates another React root. */}
            <Suspense fallback={null}>
              <group position={[0, -1.55, 0]}>
                <Character {...props} loader={loader} onReady={markReady} />
                <ContactShadows
                  position={[0, 0.005, 0]}
                  opacity={0.22}
                  scale={10}
                  blur={3}
                  far={4}
                  color="#67543e"
                  resolution={128}
                />
              </group>
            </Suspense>
            <OrbitControls
              enabled={props.interactive !== false}
              enablePan={false}
              enableZoom={false}
              target={[0, 0, 0]}
              minPolarAngle={Math.PI / 2.5}
              maxPolarAngle={Math.PI / 1.8}
            />
          </Canvas>
        )}
        {visible && loadedModel !== props.model && (
          <div className="character-loading" role="status">
            <span className="loading-dot">Meeting your character…</span>
          </div>
        )}
      </SceneBoundary>
    </div>
  );
}
