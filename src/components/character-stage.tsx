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
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useAnimations } from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { VRMLoaderPlugin, type VRM } from '@pixiv/three-vrm';
import { Vector3, Group, Mesh, LoopOnce, MathUtils, PerspectiveCamera } from 'three';
import type { ModelId } from '@/lib/domain';
import { modelPath } from '@/lib/models';
import { createCompanionClips, companionAction } from '@/lib/character-motion';
import { libraryMotions, retargetLibraryMotion } from '@/lib/motion-library';
import { characterBounds, boxFitDistance } from '@/lib/character-framing';
import { speechWeights, vowelWeights, type SpeechTrack } from '@/lib/lip-sync';
const motionLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const motionPaths = libraryMotions.map(([file]) => `/animations/mesh2motion/${file}.glb`);
type Props = {
  model: ModelId;
  speaking?: boolean;
  vowel?: number;
  speech?: { audio: HTMLAudioElement; track: SpeechTrack } | null;
  gesture?: string;
  gestureKey?: number;
  interactive?: boolean;
  compact?: boolean;
  modelZoom?: number;
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
  speech,
  gesture = 'Idle',
  gestureKey = 0,
  legacy = false,
  loader,
  onReady,
  library,
  compact = false,
  modelZoom = 1,
}: Props & { loader: GLTFLoader; onReady: () => void; library?: Awaited<ReturnType<GLTFLoader['loadAsync']>>[] }) {
  const path = modelPath(model);
  const gltf = useLoader(loader, path);
  useEffect(() => {
    onReady();
  }, [gltf, onReady]);
  const vrm = model === 'human' ? (gltf.userData.vrm as VRM) : undefined;
  const object = useMemo(() => (model === 'human' ? gltf.scene : clone(gltf.scene)), [gltf, model]);
  const group = useRef<Group>(null);
  const [cycleStep, setCycleStep] = useState(0);
  const clips = useMemo(() => {
    if (library) return [...createCompanionClips(object).filter((clip) => clip.name === 'CompanionIdle'), ...library.flatMap((motion, i) => {
      if (libraryMotions[i][1] === 'LibraryIdle') return [];
      const clip = retargetLibraryMotion(object, motion.scene, motion.animations[0], libraryMotions[i][1]);
      return clip ? [clip] : [];
    })];
    return gltf.animations.length || model === 'human' ? gltf.animations : createCompanionClips(object);
  }, [gltf, object, model, library]);
  const { actions } = useAnimations(clips, object);
  const { camera, size: viewportSize } = useThree();
  const idleName = companionAction(clips.map((c) => c.name), 'idle');
  const time = useRef(0);
  const wavingUntil = useRef(0);
  const previousGesture = useRef(0);
  const proceduralMotion = useRef('Wave');
  const transform = useMemo(() => {
    const available = clips.map((c) => c.name);
    const idle = companionAction(available, 'idle');
    // Frame once from the standing idle. Gestures must never move the camera
    // or renormalize/recenter the model as their silhouettes change.
    const box = characterBounds(object, clips.filter((clip) => clip.name === idle));
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = 3 / (Math.max(size.x, size.y, size.z) || 1);
    return {
      scale,
      size: size.multiplyScalar(scale),
      position: [-center.x * scale, -center.y * scale, -center.z * scale] as [
        number,
        number,
        number,
      ],
    };
  }, [object, clips]);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const distance = boxFitDistance(transform.size, viewportSize.width / Math.max(1, viewportSize.height), camera.fov);
    camera.position.set(0, 0, distance);
    // Projection zoom gives an exact visual increase without changing fit bounds.
    camera.zoom = compact ? 1.15 : modelZoom;
    camera.near = Math.max(.01, distance / 100);
    camera.far = distance + 100;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, transform, viewportSize.width, viewportSize.height, compact, modelZoom]);
  useEffect(() => {
    if (legacy) {
      Object.values(actions).forEach((a) => a?.stop());
      return;
    }
    const idle = idleName ? actions[idleName] : undefined;
    idle?.reset().fadeIn(0.3).play();
    return () => {
      Object.values(actions).forEach((a) => a?.stop());
    };
  }, [actions, idleName, legacy]);
  useEffect(() => {
    if (legacy || (!gestureKey && !cycleStep)) return;
    if (speaking) {
      Object.values(actions).forEach((a) => a?.fadeOut(.2));
      const idle = idleName ? actions[idleName] : undefined;
      idle?.reset().fadeIn(.2).play();
      return;
    }
    wavingUntil.current = time.current + 2.5;
    const playlist = clips.filter((c) => c.name !== idleName && !/death|dead|dying|defeat|hit|attack|bite|punch|shoot|slash|kick/i.test(c.name));
    const manual = gestureKey !== previousGesture.current;
    previousGesture.current = gestureKey;
    const chosen = manual || !cycleStep ? gesture : playlist[(cycleStep - 1) % Math.max(1, playlist.length)]?.name;
    proceduralMotion.current = chosen || ['Wave', 'Dance', 'Bow'][cycleStep % 3];
    const greetingName = chosen === 'Wave' ? companionAction(clips.map((c) => c.name), 'greeting') : undefined;
    const clip = chosen ? actions[chosen] || (greetingName ? actions[greetingName] : undefined) : undefined;
    if (clip) {
      Object.values(actions).forEach((action) => { if (action && action !== clip && action !== actions[idleName || '']) action.fadeOut(.25); });
      const idle = idleName ? actions[idleName] : undefined;
      idle?.fadeOut(0.25);
      clip.reset().setLoop(LoopOnce, 1);
      clip.clampWhenFinished = true;
      clip.fadeIn(0.25).play();
      const timeout = setTimeout(
        () => {
          clip.fadeOut(0.25);
          idle?.reset().fadeIn(0.25).play();
        },
        Math.max(1000, clip.getClip().duration * 1000),
      );
      return () => clearTimeout(timeout);
    }
  }, [actions, gesture, gestureKey, legacy, clips, idleName, cycleStep, speaking]);
  useEffect(() => {
    if (legacy || speaking) return;
    const longest = Math.max(0, ...clips.map((clip) => clip.duration));
    const timer = setInterval(() => setCycleStep((step) => step + 1), Math.max(9000, longest * 1000 + 4000));
    return () => clearInterval(timer);
  }, [clips, legacy, speaking]);
  useFrame((state, delta) => {
    if (legacy) return;
    time.current += delta;
    const t = time.current;
    const timed = speech ? speechWeights(speech.track, speech.audio.paused || speech.audio.ended ? -1 : speech.audio.currentTime) : null;
    const proceduralActive = vrm && !speaking && t < wavingUntil.current;
    if (group.current && !legacy) {
      group.current.rotation.y = proceduralActive && proceduralMotion.current === 'Dance' ? Math.sin(t * 3) * .25 : Math.sin(t * 0.35) * 0.04;
      group.current.rotation.z = proceduralActive && proceduralMotion.current === 'Dance' ? Math.sin(t * 6) * .06 : 0;
      group.current.rotation.x = proceduralActive && proceduralMotion.current === 'Bow' ? Math.sin((wavingUntil.current - t) / 2.5 * Math.PI) * .25 : 0;
    }
    if (vrm) {
      const arm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
      const other = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
      const forearm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
      const head = vrm.humanoid.getNormalizedBoneNode('head');
      const hand = vrm.humanoid.getNormalizedBoneNode('leftHand');
      const chest = vrm.humanoid.getNormalizedBoneNode('chest');
      const wave = !speaking && t < wavingUntil.current && proceduralMotion.current === 'Wave';
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
      const timedVowels = timed ? vowelWeights(timed) : null;
      names.forEach((n, i) =>
        vrm.expressionManager?.setValue(
          n,
          MathUtils.damp(
            vrm.expressionManager?.getValue(n) || 0,
            timedVowels ? timedVowels[n] || 0 : speaking && i === vowel ? .55 : 0,
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
            if (/v_(aa|ih|ou|ee|oh|pp|ff|th|dd|kk|ss|nn|rr|ch|sil)$/.test(name)) {
              const key = name.split('v_').at(-1)!;
              const active = name.endsWith(`v_${['aa', 'ih', 'ou', 'ee', 'oh'][vowel]}`);
              const target = timed ? timed[key] || 0 : speaking && active ? .65 : 0;
              mesh.morphTargetInfluences[i] = MathUtils.damp(mesh.morphTargetInfluences[i], target, key === 'pp' ? 45 : 28, delta);
            } else if (/blink$/.test(name)) {
              mesh.morphTargetInfluences[i] = Math.pow(Math.max(0, Math.sin(t * 0.65)), 24);
            }
          }
          const index = mesh.morphTargetDictionary.Surprised;
          if (index !== undefined)
            mesh.morphTargetInfluences[index] = MathUtils.damp(
              mesh.morphTargetInfluences[index],
              timed ? Math.min(.7,(timed.aa || 0) + (timed.oh || 0) * .6 + (timed.ee || 0) * .3) : speaking ? .3 : 0,
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
function LibraryCharacter(props: Props & { loader: GLTFLoader; onReady: () => void }) {
  const library = useLoader(motionLoader, motionPaths);
  return <Character {...props} library={library} />;
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
              <group>
                {/^download:(?:\d+_)/.test(props.model)
                  ? <LibraryCharacter {...props} loader={loader} onReady={markReady} />
                  : <Character {...props} loader={loader} onReady={markReady} />}
                <ContactShadows
                  position={[0, -1.55, 0]}
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
