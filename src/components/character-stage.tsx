'use client';
import {
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  ContactShadows,
  OrbitControls,
  View,
  PerspectiveCamera as ViewCamera,
} from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import {
  Vector3,
  Group,
  Mesh,
  LoopOnce,
  MathUtils,
  PerspectiveCamera,
  AnimationMixer,
  Cache,
} from 'three';
import { GalleryContext } from './gallery-renderer';
import { galleryModelQueue } from '@/lib/model-load-queue';
import type { ModelId } from '@/lib/domain';
import { modelPath, isVrmModel } from '@/lib/models';
import { createCompanionClips, companionAction } from '@/lib/character-motion';
import { libraryMotions, retargetLibraryMotion, seatedSequence } from '@/lib/motion-library';
import { retargetVRMMotion } from '@/lib/vrm-motion';
import { characterBounds, boxFitDistance } from '@/lib/character-framing';
import { speechWeights, vowelWeights, type SpeechTrack } from '@/lib/lip-sync';
Cache.enabled = true;
const sharedModelLoader = new GLTFLoader();
function useActiveAnimations(
  clips: import('three').AnimationClip[],
  object: import('three').Object3D,
  active: boolean,
) {
  const mixer = useMemo(() => new AnimationMixer(object), [object]);
  const actions = useMemo(
    () => Object.fromEntries(clips.map((clip) => [clip.name, mixer.clipAction(clip, object)])),
    [clips, mixer, object],
  );
  useFrame((_, delta) => {
    if (active) mixer.update(Math.min(delta, 0.05));
  });
  useEffect(
    () => () => {
      mixer.stopAllAction();
    },
    [mixer, object],
  );
  return { actions, mixer };
}
/** Copy the shared GPU view into a canvas physically inside its card.
 * CSS/compositor scrolling then moves the pixels and card together, even between WebGL frames. */
function CardPreview({
  target,
  active,
}: {
  target: React.RefObject<HTMLCanvasElement | null>;
  active: boolean;
}) {
  const elapsed = useRef(0);
  useFrame(({ gl }, delta) => {
    if (!active || !target.current) return;
    elapsed.current += delta;
    if (elapsed.current < 1 / 30) return;
    elapsed.current = 0;
    const canvas = target.current,
      source = gl.domElement;
    const rect = canvas.getBoundingClientRect(),
      origin = source.getBoundingClientRect();
    if (!rect.width || !rect.height || !origin.width || !origin.height) return;
    const ratio = source.width / origin.width;
    const width = Math.round(rect.width * ratio),
      height = Math.round(rect.height * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.clearRect(0, 0, width, height);
    context.drawImage(
      source,
      (rect.left - origin.left) * ratio,
      (rect.top - origin.top) * ratio,
      rect.width * ratio,
      rect.height * ratio,
      0,
      0,
      width,
      height,
    );
  }, 100);
  return null;
}
const motionLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const motionPaths = libraryMotions.map(([file]) => `/animations/mesh2motion/${file}.glb`);
type Props = {
  model: ModelId;
  active?: boolean;
  onGestureComplete?: (key: number) => void;
  directed?: boolean;
  directedCue?: boolean;
  speaking?: boolean;
  vowel?: number;
  speech?: {
    audio: { currentTime: number; paused: boolean; ended: boolean };
    track: SpeechTrack;
  } | null;
  gesture?: string;
  gestureKey?: number;
  interactive?: boolean;
  compact?: boolean;
  modelZoom?: number;
  portrait?: boolean;
  legacy?: boolean;
};
class SceneBoundary extends Component<
  { children: ReactNode; onFailure?: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure?.();
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
  active = true,
  speaking = false,
  directed = false,
  onGestureComplete,
  directedCue = false,
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
  portrait = true,
}: Props & {
  loader: GLTFLoader;
  onReady: () => void;
  library?: Awaited<ReturnType<GLTFLoader['loadAsync']>>[];
}) {
  const path = modelPath(model);
  const gltf = useLoader(loader, path);
  useEffect(() => {
    onReady();
  }, [gltf, onReady]);
  const vrm = isVrmModel(model) ? (gltf.userData.vrm as VRM) : undefined;
  const object = useMemo(() => (isVrmModel(model) ? gltf.scene : clone(gltf.scene)), [gltf, model]);
  useMemo(() => {
    if (vrm && !vrm.scene.userData.facingCorrected) {
      VRMUtils.rotateVRM0(vrm);
      vrm.scene.userData.facingCorrected = true;
    }
  }, [vrm]);
  const group = useRef<Group>(null);
  const [cycleStep, setCycleStep] = useState(0);
  const clips = useMemo(() => {
    if (library) {
      const result = [
        ...(vrm
          ? []
          : createCompanionClips(object).filter((clip) => clip.name === 'CompanionIdle')),
        ...library.flatMap((motion, i) => {
          if (!vrm && libraryMotions[i][1] === 'LibraryIdle') return [];
          if (
            compact &&
            !['LibraryIdle', 'Wave', 'Dance', 'Think', 'Clap'].includes(libraryMotions[i][1])
          )
            return [];
          const clip = vrm
            ? retargetVRMMotion(vrm, motion.scene, motion.animations[0], libraryMotions[i][1])
            : retargetLibraryMotion(
                object,
                motion.scene,
                motion.animations[0],
                libraryMotions[i][1],
              );
          return clip ? [clip] : [];
        }),
      ];
      const sit = seatedSequence(result);
      return [
        ...result.filter((c) => !/^Sit(?:Enter|Idle|Exit)$/.test(c.name)),
        ...(sit ? [sit] : []),
      ];
    }
    return gltf.animations.length || isVrmModel(model)
      ? gltf.animations
      : createCompanionClips(object);
  }, [gltf, object, model, library, compact, vrm]);
  const { actions, mixer } = useActiveAnimations(clips, object, active);
  const { camera, size: viewportSize } = useThree();
  const controls = useThree((state) => state.controls) as unknown as {
    target: Vector3;
    update: () => void;
  } | null;
  const idleName = companionAction(
    clips.map((c) => c.name),
    'idle',
  );
  const time = useRef(0);
  const wavingUntil = useRef(0);
  const previousGesture = useRef(0);
  const proceduralMotion = useRef('Wave');
  const transform = useMemo(() => {
    const available = clips.map((c) => c.name);
    const idle = companionAction(available, 'idle');
    // Frame once from the standing idle and full greeting reach. Gestures must never move the camera
    // or renormalize/recenter the model as their silhouettes change.
    const box = characterBounds(
      object,
      clips.filter(
        (clip) => clip.name === idle || clip.name === 'Wave' || clip.name === 'CompanionWave',
      ),
      compact ? 3 : 8,
    );
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
  }, [object, clips, compact]);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const distance = boxFitDistance(
      transform.size,
      viewportSize.width / Math.max(1, viewportSize.height),
      camera.fov,
    );
    camera.position.set(0, 0, distance);
    // Projection zoom gives an exact visual increase without changing fit bounds.
    const faceView = isVrmModel(model) && portrait && !compact;
    if (faceView) camera.position.y = transform.size.y * 0.32;
    camera.zoom = compact ? 1.15 : modelZoom * (faceView ? 2.4 : 1);
    camera.near = Math.max(0.01, distance / 100);
    camera.far = distance + 100;
    const focusY = faceView ? transform.size.y * 0.32 : 0;
    controls?.target.set(0, focusY, 0);
    controls?.update();
    camera.lookAt(0, focusY, 0);
    camera.updateProjectionMatrix();
  }, [
    camera,
    transform,
    viewportSize.width,
    viewportSize.height,
    compact,
    modelZoom,
    portrait,
    model,
    controls,
  ]);
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
    if ((speaking && !directedCue) || (gesture === 'Idle' && (directed || !cycleStep))) {
      wavingUntil.current = 0;
      Object.values(actions).forEach((a) => a?.fadeOut(0.2));
      const idle = idleName ? actions[idleName] : undefined;
      idle?.reset().fadeIn(0.2).play();
      return;
    }
    wavingUntil.current = time.current + 2.5;
    const playlist = clips.filter(
      (c) =>
        c.name !== idleName &&
        c.name !== 'Sit' &&
        !/death|dead|dying|defeat|hit|attack|bite|punch|shoot|slash|kick/i.test(c.name),
    );
    const manual = gestureKey !== previousGesture.current;
    previousGesture.current = gestureKey;
    const chosen =
      manual || !cycleStep
        ? gesture
        : playlist[(cycleStep - 1) % Math.max(1, playlist.length)]?.name;
    proceduralMotion.current = chosen || ['Wave', 'Dance', 'Bow'][cycleStep % 3];
    const greetingName =
      chosen === 'Wave' && !directed
        ? companionAction(
            clips.map((c) => c.name),
            'greeting',
          )
        : undefined;
    const clip = chosen
      ? actions[chosen] || (greetingName ? actions[greetingName] : undefined)
      : undefined;
    if (clip) {
      Object.values(actions).forEach((action) => {
        if (action && action !== clip && action !== actions[idleName || '']) action.fadeOut(0.25);
      });
      const idle = idleName ? actions[idleName] : undefined;
      idle?.fadeOut(0.25);
      clip.reset().setLoop(LoopOnce, 1);
      clip.clampWhenFinished = true;
      clip.fadeIn(0.25).play();
      let fadeTimer: ReturnType<typeof setTimeout> | undefined;
      const finish = (event: { action: unknown }) => {
        if (event.action !== clip) return;
        clip.fadeOut(0.25);
        idle?.reset().fadeIn(0.25).play();
        fadeTimer = setTimeout(() => onGestureComplete?.(gestureKey), 250);
      };
      mixer.addEventListener('finished', finish);
      return () => {
        mixer.removeEventListener('finished', finish);
        clearTimeout(fadeTimer);
      };
    }
    const timeout = setTimeout(() => onGestureComplete?.(gestureKey), vrm ? 2750 : 0);
    return () => clearTimeout(timeout);
  }, [
    actions,
    gesture,
    gestureKey,
    legacy,
    clips,
    idleName,
    cycleStep,
    speaking,
    directedCue,
    directed,
    mixer,
    onGestureComplete,
  ]);
  useEffect(() => {
    if (legacy || speaking || directed || !active) return;
    // Long source clips (especially dance loops) can run for tens of seconds. Using
    // the longest clip here made the automatic showcase look like it had stopped.
    // Advance at a predictable pace; each selected gesture is already clamped to
    // one play and fades back to idle before the next cycle starts.
    const timer = setInterval(() => setCycleStep((step) => step + 1), 3000);
    return () => clearInterval(timer);
  }, [legacy, speaking, directed, active]);
  useFrame((state, delta) => {
    if (legacy || !active) return;
    time.current += delta;
    const t = time.current;
    const timed = speech
      ? speechWeights(
          speech.track,
          speech.audio.paused || speech.audio.ended ? -1 : speech.audio.currentTime,
        )
      : null;
    const proceduralActive =
      vrm && !clips.length && (!speaking || directedCue) && t < wavingUntil.current;
    if (group.current && !legacy) {
      group.current.rotation.y =
        proceduralActive && proceduralMotion.current === 'Dance'
          ? Math.sin(t * 3) * 0.25
          : speaking
            ? 0
            : Math.sin(t * 0.35) * 0.04;
      group.current.rotation.z =
        proceduralActive && proceduralMotion.current === 'Dance' ? Math.sin(t * 6) * 0.06 : 0;
      group.current.rotation.x =
        proceduralActive && proceduralMotion.current === 'Bow'
          ? Math.sin(((wavingUntil.current - t) / 2.5) * Math.PI) * 0.25
          : 0;
    }
    if (vrm) {
      if (!clips.length) {
        const arm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
        const other = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
        const forearm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
        const head = vrm.humanoid.getNormalizedBoneNode('head');
        const hand = vrm.humanoid.getNormalizedBoneNode('leftHand');
        const chest = vrm.humanoid.getNormalizedBoneNode('chest');
        const vrm0 = vrm.meta.metaVersion === '0';
        const armSign = vrm0 ? -1 : 1;
        const wave =
          (!speaking || directedCue) &&
          t < wavingUntil.current &&
          proceduralMotion.current === 'Wave';
        if (hand) hand.rotation.z = wave ? Math.sin(t * 9) * 0.3 : 0;
        if (chest) chest.rotation.x = Math.sin(t * 1.8) * 0.01;
        if (arm) {
          arm.rotation.z = armSign * (wave ? 0.2 : -1.12);
          arm.rotation.x = wave ? -0.7 : Math.sin(t) * 0.02;
        }
        if (other) other.rotation.z = armSign * 1.12;
        if (forearm) forearm.rotation.y = wave ? armSign * -1.2 : 0;
        if (head) {
          head.rotation.y = state.pointer.x * 0.16;
          head.rotation.x = Math.sin(t * 0.65) * 0.025;
          if (wave) head.rotation.z = Math.sin(t * 5) * 0.035;
        }
      }
      const names = ['aa', 'ih', 'ou', 'ee', 'oh'];
      const timedVowels = timed ? vowelWeights(timed) : null;
      names.forEach((n, i) =>
        vrm.expressionManager?.setValue(
          n,
          MathUtils.damp(
            vrm.expressionManager?.getValue(n) || 0,
            timedVowels ? timedVowels[n] || 0 : speaking && i === vowel ? 0.55 : 0,
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
              const target = timed ? timed[key] || 0 : speaking && active ? 0.65 : 0;
              mesh.morphTargetInfluences[i] = MathUtils.damp(
                mesh.morphTargetInfluences[i],
                target,
                key === 'pp' ? 45 : 28,
                delta,
              );
            } else if (/blink$/.test(name)) {
              mesh.morphTargetInfluences[i] = Math.pow(Math.max(0, Math.sin(t * 0.65)), 24);
            }
          }
          const index = mesh.morphTargetDictionary.Surprised;
          if (index !== undefined)
            mesh.morphTargetInfluences[index] = MathUtils.damp(
              mesh.morphTargetInfluences[index],
              timed
                ? Math.min(0.7, (timed.aa || 0) + (timed.oh || 0) * 0.6 + (timed.ee || 0) * 0.3)
                : speaking
                  ? 0.3
                  : 0,
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
  const sharedGallery = useContext(GalleryContext) && !!props.compact;
  const [started, setStarted] = useState(false);
  const releaseLoad = useRef<(() => void) | null>(null);
  const queued = useRef(false);

  const loader = useMemo(
    () =>
      isVrmModel(props.model)
        ? new GLTFLoader().register((parser) => new VRMLoaderPlugin(parser))
        : sharedModelLoader,
    [props.model],
  );
  const [visible, setVisible] = useState(false);
  const [loadedModel, setLoadedModel] = useState<ModelId | null>(null);
  useEffect(() => {
    // An offscreen or unloaded canvas cannot complete an animation; do not hold the chat queue.
    if (props.directedCue && (!visible || loadedModel !== props.model))
      props.onGestureComplete?.(props.gestureKey || 0);
  }, [
    visible,
    loadedModel,
    props.model,
    props.directedCue,
    props.gestureKey,
    props.onGestureComplete,
  ]);
  const markReady = useCallback(() => {
    setLoadedModel(props.model);
    // Yield one paint for shader upload before admitting another new model.
    setTimeout(() => {
      releaseLoad.current?.();
      releaseLoad.current = null;
    }, 120);
  }, [props.model]);
  useEffect(() => {
    if (!visible || started || queued.current) return;
    queued.current = true;
    const cancel = galleryModelQueue.request((release) => {
      releaseLoad.current = release;
      setStarted(true);
    });
    return () => {
      cancel();
      if (!started) {
        queued.current = false;
      }
    };
  }, [visible, started]);
  useEffect(
    () => () => {
      releaseLoad.current?.();
      releaseLoad.current = null;
    },
    [],
  );
  const ref = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: '150px',
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const scene = (
    <>
      <ambientLight intensity={isVrmModel(props.model) ? 0.65 : 1.7} />
      <hemisphereLight args={['#fff8ec', '#d4c6ae', 1.7]} />
      <directionalLight position={[3, 5, 4]} intensity={isVrmModel(props.model) ? 1.2 : 3} />
      <directionalLight position={[-3, 2, -2]} intensity={isVrmModel(props.model) ? 0.4 : 1.3} />
      {/* DOM loading UI stays outside Canvas: Drei Html creates another React root. */}
      <Suspense fallback={null}>
        <group>
          {/^download:(?:\d+_)/.test(props.model) || isVrmModel(props.model) ? (
            <LibraryCharacter {...props} loader={loader} onReady={markReady} active={visible} />
          ) : (
            <Character {...props} loader={loader} onReady={markReady} active={visible} />
          )}
          {!sharedGallery && (
            <ContactShadows
              frames={1}
              position={[0, -1.55, 0]}
              opacity={0.22}
              scale={10}
              blur={3}
              far={4}
              color="#67543e"
              resolution={128}
            />
          )}
        </group>
      </Suspense>
    </>
  );
  return (
    <div
      ref={ref}
      className={`character-stage ${props.compact ? 'compact' : ''}`}
      style={sharedGallery ? { overflow: 'hidden', isolation: 'isolate' } : undefined}
      data-model={props.model}
      data-scene-mounted={started ? 'true' : 'false'}
      data-scene-ready={loadedModel === props.model ? 'true' : 'false'}
      data-scene-active={visible ? 'true' : 'false'}
      aria-busy={visible && loadedModel !== props.model}
      aria-label={`Animated ${isVrmModel(props.model) ? 'human' : props.model} character`}
    >
      <SceneBoundary
        onFailure={() => {
          releaseLoad.current?.();
          releaseLoad.current = null;
        }}
      >
        {sharedGallery && (
          <canvas
            ref={preview}
            data-card-preview="true"
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          />
        )}
        {started && sharedGallery && (
          <View visible={visible} style={{ position: 'absolute', inset: 0 }}>
            <ViewCamera makeDefault position={[0, 0, 6.4]} fov={35} />
            {scene}
            <CardPreview target={preview} active={visible} />
          </View>
        )}
        {started && !sharedGallery && (
          <Canvas
            dpr={[1, 2]}
            frameloop={visible ? 'always' : 'never'}
            camera={{ position: [0, 1.65, 6.4], fov: 35 }}
            gl={{ antialias: true, alpha: true }}
          >
            {scene}{' '}
            <OrbitControls
              makeDefault
              enabled={props.interactive !== false}
              enablePan={false}
              enableZoom={false}
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
