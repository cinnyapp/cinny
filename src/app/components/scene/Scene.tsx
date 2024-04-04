/* eslint-disable react/no-array-index-key */
/* eslint-disable consistent-return */
/* eslint-disable no-use-before-define */
/* eslint-disable react/no-unknown-property */
import React, {
  useRef,
  useMemo,
  useReducer,
  memo,
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  FC,
} from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment, Bounds } from '@react-three/drei'
import { BallCollider, Physics, RigidBody } from '@react-three/rapier'
import { EffectComposer, N8AO, TiltShift2 } from '@react-three/postprocessing'
import { easing } from 'maath'
import { useMediaQuery } from 'usehooks-ts'
import { useInView } from 'framer-motion'

import styles from './Scene.module.scss'

const COLORS = {
  black: '#0f0f0f',
  white: '#f1f1f1',
  gray: {
    700: '#515151',
  },
  blue: '#24bdff',
  orange: '#ff8024',
}
const BREAKPOINTS = {
  md: '48rem', // 768px
  lg: '64rem', // 1024px
  xl: '90rem', // 1440px
}

const PLANE_SIZE = 7
const colors = [COLORS.white, COLORS.orange]

const randFloatSpreadWithGap = (range: number, gap = 0) => {
  const v = gap + Math.random() * (range - gap)
  return (Math.random() < 0.5 ? -1 : 1) * v
}
const rfs = () => randFloatSpreadWithGap(18, 13)
const randAngle = () => Math.random() * Math.PI

const PositionContext = createContext(new THREE.Vector3())

export const Scene = memo(({ placeholderRef }: any) => {
  const [currentColorIndex, click] = useReducer((state) => (state + 1) % colors.length, 0)

  const [margin, setMargin] = useState<any>()
  const [groupPosition, setGroupPosition] = useState<any>([0, 0, 0])
  const groupPositionVec3 = useMemo(() => new THREE.Vector3(...groupPosition), [groupPosition])

  const canvasRef = useRef<any>()

  const handleResize = useCallback(() => {
    const placeholderClientRect = placeholderRef?.current?.getBoundingClientRect()
    if (!placeholderClientRect) return null
    // const canvasClientRect = canvasRef?.current?.getBoundingClientRect()
    if (!placeholderClientRect) return null

    const {
      left: placeholderLeft,
      top: placeholderTop,
      width: placeholderWidth,
      height: placeholderHeight,
    } = placeholderClientRect
    const {
      left: canvasLeft,
      top: canvasTop,
      width: canvasWidth,
      height: canvasHeight,
    } = placeholderClientRect

    const currentMargin =
      Math.min(canvasWidth, canvasHeight) / Math.min(placeholderWidth, placeholderHeight)
    setMargin(currentMargin)

    const percentX = (placeholderWidth / 2 + placeholderLeft - canvasLeft) / canvasWidth
    const percentY = (placeholderHeight / 2 + placeholderTop - canvasTop) / canvasHeight
    const canvasAspectRatio = canvasWidth / canvasHeight

    setGroupPosition([
      (percentX * 2 - 1) * (PLANE_SIZE / 2) * Math.max(canvasAspectRatio, 1) * currentMargin,
      (1 - percentY * 2) * (PLANE_SIZE / 2) * Math.max(1 / canvasAspectRatio, 1) * currentMargin,
      0,
    ])
  }, [placeholderRef])

  const [isCreated, setIsCreated] = useState(false)
  const [hasHandledResizeOnce, setHasHandledResizeOnce] = useState(false)

  useEffect(() => {
    if (!isCreated) return

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
    }
    handleResize()
    setHasHandledResizeOnce(true)

    return () => {
      if (typeof window === 'undefined') return;

      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize, isCreated])

  const isInView = useInView(canvasRef, { once: true })
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`)

  if (!isLg) {
    return null
  }

  return (
    <Canvas
      ref={canvasRef}
      onClick={click}
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: false }}
      // gl={{ antialias: false, alpha: false, stencil: false, depth: true }}
      camera={{ position: [0, 0, 36], fov: 17.5, near: 1, far: 100 }}
      className={`"h-full w-full cursor-pointer" ${styles.scene}`}
      onCreated={() => setIsCreated(true)}
    >
      <color attach="background" args={['#15171a']} />

      {hasHandledResizeOnce && (
        <>
          <FitManager margin={margin} />

          <PositionContext.Provider value={groupPositionVec3}>
            <Physics gravity={[0, 0, 1]} colliders={false}>
              <Pointer />
              {isInView && (
                <>
                  {/* this static star prevents lags when glass material appears on the screen for the first time */}

                  {/* <Star position={[0, 0, 200]} rotation={[0, 0, 0]}>
                    <GlassMaterial />
                  </Star> */}

                  {new Array(6).fill(0).map((_, index) => (
                    <Star key={index} color="#fff" />
                  ))}

                  <Star color="#97FF45" />
                  <Star color="#97FF45" />

                  <Star color="#FFE76B" />
                  <Star color="#FFE76B" />

                  <Star color="#FF730E" />
                  <Star color="#FF730E" />

                  <Star color="#EE5757" />
                  <Star color="#EE5757" />

                  <Star color="#30CDFF" />
                  <Star color="#30CDFF" />

                  <Star color="#fff" />
                  <Star color="#fff" />
                  <Circle color="#9494FF" position={[0, 0, 300]} rotation={[0, 0, 0]}>
                    {/* <GlassMaterial /> */}
                  </Circle>
                  {/* <Circle position={[100, 0, 100]} rotation={[0, 0, 0]}>
                    <GlassMaterial />
                  </Circle> */}

                  {/* <Circle position={[-100, 0, 300]} rotation={[0, 0, 0]}>
                    <GlassMaterial />
                  </Circle> */}
                </>
              )}
            </Physics>
          </PositionContext.Provider>

          <group position={groupPosition}>
            <Light />
            {/* <mesh>
              <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
            </mesh> */}
          </group>

          <Effects />
        </>
      )}
    </Canvas>
  )
})

const FitManager: FC<any> = ({ margin }) => {
  const get = useThree((state) => state.get)

  return (
    <Bounds
      fit
      observe
      // damping={0}
      margin={margin}
      onFit={() => {
        const { set, viewport } = get()
        set((state) => ({ viewport: { ...state.viewport, ...viewport.getCurrentViewport() } }))
      }}
    >
      <mesh visible={false}>
        <planeGeometry args={[10, 10]} />
        {/* PLANE SIZE */}
      </mesh>
    </Bounds>
  )
}

function Light() {
  const ref = useRef<any>()

  useEffect(() => {
    ref.current.target = ref.current.parent
  }, [])

  return (
    <>
      <ambientLight intensity={2} />
      <spotLight
        ref={ref}
        position={[10, 10, 10]}
        angle={0.25}
        penumbra={1}
        intensity={1000}
        castShadow
      />
      <Environment
        files={['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']}
        path="/public/adamsbridge-cubemap/"
      />
    </>
  )
}

function Effects() {
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl})`)

  const start = useMemo(() => (isXl ? [0.0, 0.5] : [0.5, 0.0]), [isXl])
  const end = useMemo(() => (isXl ? [1.0, 0.5] : [0.5, 1.0]), [isXl])

  return (
    <EffectComposer
      // disableNormalPass
      multisampling={8}
    >
      <N8AO distanceFalloff={1} aoRadius={1} intensity={4} quality="medium" />
      <TiltShift2 blur={100} taper={10} start={start} end={end} />
    </EffectComposer>
  )
}

const Pointer: FC<any> = ({ vec = new THREE.Vector3() }) => {
  const ref = useRef<any>()

  useFrame(({ mouse, viewport }) => {
    ref.current?.setNextKinematicTranslation(
      vec.set((mouse.x * viewport.width) / 2, (mouse.y * viewport.height) / 2, 0),
    )
  })

  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" ref={ref}>
      <BallCollider args={[1]} />
    </RigidBody>
  )
}

const ModelWrapper: FC<any> = ({
  vec = new THREE.Vector3(),
  position,
  rotation,
  children,
  damping = 10,
}) => {
  const api = useRef<any>()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pos = useMemo(() => position || [rfs(), rfs(), rfs()], [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rot = useMemo(() => rotation || [randAngle(), randAngle(), randAngle()], [])

  const groupPosition = useContext(PositionContext)

  useFrame(() => {
    api.current?.applyImpulse(
      vec.copy(api.current.translation()).sub(groupPosition).negate().multiplyScalar(0.1),
      false,
    )
  })

  return (
    <RigidBody
      linearDamping={damping}
      angularDamping={2}
      friction={1}
      position={pos}
      rotation={rot}
      ref={api}
      colliders="hull"
    >
      {children}
    </RigidBody>
  )
}

const Circle: FC<any> = ({ children, color, ...restProps }) => {
  const { nodes } = useGLTF('/public/model.glb')

  return (
    <ModelWrapper damping={2} {...restProps}>
      <mesh castShadow receiveShadow geometry={(nodes.Curve002 as any).geometry}>
        <meshStandardMaterial metalness={1} roughness={0.32} color={color} />
        {children}
      </mesh>
      {/* <pointLight intensity={400} distance={2.5} color={COLORS.blue} /> */}
    </ModelWrapper>
  )
}

const Star: FC<any> = ({ color, children, ...restProps }) => {
  const gltfModel: any = useGLTF<any>('/public/model.glb')

  const { nodes } = gltfModel

  const ref = useRef<any>()
  useFrame((state, delta) => {
    easing.dampC(ref.current.material.color, color, 0.2, delta)
  })

  const scale = 0.45

  return (
    <ModelWrapper {...restProps}>
      <mesh
        scale={[scale, scale, scale]}
        ref={ref}
        castShadow
        receiveShadow
        geometry={nodes.Curve.geometry}
      >
        <meshStandardMaterial metalness={1} roughness={0.45} color={color} />
        {children}
      </mesh>
      <mesh
        scale={[scale, scale, scale]}
        castShadow
        receiveShadow
        geometry={nodes.Curve_1.geometry}
      >
        <meshStandardMaterial metalness={1} roughness={0.45} color={COLORS.black} />
      </mesh>
    </ModelWrapper>
  )
}

// const GlassMaterial: FC = (props) => (
//     <MeshTransmissionMaterial
//       transmission={0.95}
//       clearcoat={1}
//       thickness={0.7}
//       anisotropicBlur={0.5}
//       chromaticAberration={0.7}
//       samples={8}
//       resolution={1024}
//       {...props}
//     />
//   )

// function Logo({ children, ...restProps }) {
//   const { nodes } = useGLTF('/logo-v1.glb');
//   return (
//     <ModelWrapper>
//       <mesh castShadow receiveShadow geometry={nodes.logo.geometry} {...restProps}>
//         <MeshTransmissionMaterial
//           color={COLORS.white}
//           transmission={0.95}
//           thickness={0.5}
//           roughness={0.1}
//           chromaticAberration={0.5}
//           anisotropicBlur={0.2}
//           resolution={1024}
//         />
//         {children}
//       </mesh>
//     </ModelWrapper>
//   );
// }

useGLTF.preload('/public/model.glb')
// useGLTF.preload('/star-v1.glb')
// useGLTF.preload('/logo-v1.glb');
