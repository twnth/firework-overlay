'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const DEFAULT_COLORS = [
  '#ff5a36',
  '#ff7b22',
  '#ffb000',
  '#ffd166',
  '#ff4d6d',
  '#ffd6a5',
]

export const FIREWORK_OVERLAY_DEFAULTS = {
  className: 'absolute inset-0 h-full w-full pointer-events-none',
  style: undefined,
  zIndex: 99999,
  colors: DEFAULT_COLORS,
  pixelRatioCap: 1.75,
  cameraZ: 8,
  spawnIntervalMs: 1250,
  burstCountRange: [1, 3],
  spawnXRange: [-2.4, 2.4],
  startY: -3.35,
  targetYRange: [1.4, 2.3],
  clusterSpacingRange: [0.9, 1.4],
  clusterJitterRange: [-0.35, 0.35],
  worldXClamp: [-3.6, 3.6],
  tailLength: 10,
  rocketDurationRange: [1.35, 1.85],
  explosionDurationRange: [1.45, 1.95],
  targetOffsetXRange: [-1.1, 1.1],
  targetOffsetYRange: [0.4, 2.2],
  targetOffsetZRange: [-1.4, 1.4],
  startZRange: [-0.6, 0.6],
  sparkCountRange: [176, 264],
  coreCountRange: [48, 68],
  sparkSpeedRange: [1.15, 2.9],
  coreSpeedRange: [0.45, 1.35],
  sparkSpread: 1.95,
  coreSpread: 1.2,
  sparkSize: 0.2,
  coreSize: 0.32,
  rocketSize: 0.11,
  trailSize: 0.09,
  rocketOpacity: 0.95,
  trailOpacity: 0.55,
  deltaMultiplier: 1.45,
  gravityStrength: 2.4,
  dragStrength: 0.9,
  sparkleFade: 0.95,
  coreFade: 1.35,
}

function randomRange(min, max) {
  return min + Math.random() * (max - min)
}

function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1))
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function createConfig(overrides = {}) {
  return {
    ...FIREWORK_OVERLAY_DEFAULTS,
    ...overrides,
  }
}

function chooseColor(colors) {
  return new THREE.Color(colors[Math.floor(Math.random() * colors.length)])
}

class Firework {
  constructor(scene, config, startX = 0) {
    this.scene = scene
    this.config = config
    this.start = new THREE.Vector3(
      startX,
      config.startY,
      randomRange(...config.startZRange),
    )
    this.target = new THREE.Vector3(
      startX + randomRange(...config.targetOffsetXRange),
      randomRange(...config.targetYRange) + randomRange(...config.targetOffsetYRange),
      randomRange(...config.targetOffsetZRange),
    )

    this.elapsed = 0
    this.rocketDuration = randomRange(...config.rocketDurationRange)
    this.explosionElapsed = 0
    this.explosionDuration = randomRange(...config.explosionDurationRange)
    this.isExploded = false
    this.isDone = false
    this.baseColor = chooseColor(config.colors)

    this.rocket = this.createRocket()
    this.trail = this.createTrail()
    this.scene.add(this.rocket)
    this.scene.add(this.trail)

    this.sparkPoints = null
    this.corePoints = null
    this.sparkVelocities = []
    this.coreVelocities = []
    this.sparkLife = []
    this.coreLife = []
  }

  createRocket() {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [this.start.x, this.start.y, this.start.z],
        3,
      ),
    )
    const material = new THREE.PointsMaterial({
      color: 0xfff6df,
      size: this.config.rocketSize,
      transparent: true,
      opacity: this.config.rocketOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return new THREE.Points(geometry, material)
  }

  createTrail() {
    const positions = new Float32Array(this.config.tailLength * 3)
    const colors = new Float32Array(this.config.tailLength * 3)

    for (let i = 0; i < this.config.tailLength; i++) {
      const i3 = i * 3
      positions[i3] = this.start.x
      positions[i3 + 1] = this.start.y
      positions[i3 + 2] = this.start.z

      const color = this.baseColor.clone().lerp(new THREE.Color('#fff1d0'), 0.4)
      const fade = 1 - i / this.config.tailLength
      colors[i3] = color.r * fade
      colors[i3 + 1] = color.g * fade
      colors[i3 + 2] = color.b * fade
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: this.config.trailSize,
      vertexColors: true,
      transparent: true,
      opacity: this.config.trailOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    return new THREE.Points(geometry, material)
  }

  getRocketPosition(progress) {
    const eased = 1 - Math.pow(1 - progress, 2.2)
    const pos = this.start.clone().lerp(this.target, eased)
    pos.x += Math.sin(progress * Math.PI * 1.6) * 0.08
    pos.z += Math.cos(progress * Math.PI * 1.3) * 0.06
    return pos
  }

  updateRocket(delta) {
    this.elapsed += delta
    const progress = Math.min(this.elapsed / this.rocketDuration, 1)
    const current = this.getRocketPosition(progress)

    const rocketPositions = this.rocket.geometry.attributes.position.array
    rocketPositions[0] = current.x
    rocketPositions[1] = current.y
    rocketPositions[2] = current.z
    this.rocket.geometry.attributes.position.needsUpdate = true

    const trailPositions = this.trail.geometry.attributes.position.array
    for (let i = this.config.tailLength - 1; i > 0; i--) {
      const i3 = i * 3
      const prev3 = (i - 1) * 3
      trailPositions[i3] = trailPositions[prev3]
      trailPositions[i3 + 1] = trailPositions[prev3 + 1]
      trailPositions[i3 + 2] = trailPositions[prev3 + 2]
    }
    trailPositions[0] = current.x
    trailPositions[1] = current.y
    trailPositions[2] = current.z
    this.trail.geometry.attributes.position.needsUpdate = true
    this.trail.material.opacity = 0.3 + (1 - progress) * 0.3

    if (progress >= 1) {
      this.explode()
    }
  }

  createExplosionLayer(count, speedRange, spread = 1) {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const velocities = []
    const life = []

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      positions[i3] = this.target.x
      positions[i3 + 1] = this.target.y
      positions[i3 + 2] = this.target.z

      const color = this.baseColor.clone()
      color.offsetHSL(
        randomRange(-0.015, 0.02),
        randomRange(-0.02, 0.06),
        randomRange(0.02, 0.16),
      )
      colors[i3] = Math.min(1, color.r)
      colors[i3 + 1] = Math.min(1, color.g)
      colors[i3 + 2] = Math.min(1, color.b)

      const dir = new THREE.Vector3(
        randomRange(-1, 1) * spread,
        randomRange(-0.85, 1) * spread,
        randomRange(-1, 1) * spread,
      ).normalize()
      velocities.push(dir.multiplyScalar(randomRange(...speedRange)))
      life.push(randomRange(0.65, 1))
    }

    return { positions, colors, velocities, life }
  }

  explode() {
    this.isExploded = true
    this.scene.remove(this.rocket)
    this.scene.remove(this.trail)
    this.rocket.geometry.dispose()
    this.rocket.material.dispose()
    this.trail.geometry.dispose()
    this.trail.material.dispose()

    const sparkData = this.createExplosionLayer(
      randomInt(...this.config.sparkCountRange),
      this.config.sparkSpeedRange,
      this.config.sparkSpread,
    )
    const coreData = this.createExplosionLayer(
      randomInt(...this.config.coreCountRange),
      this.config.coreSpeedRange,
      this.config.coreSpread,
    )

    this.sparkVelocities = sparkData.velocities
    this.sparkLife = sparkData.life
    this.coreVelocities = coreData.velocities
    this.coreLife = coreData.life

    const sparkGeometry = new THREE.BufferGeometry()
    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkData.positions, 3))
    sparkGeometry.setAttribute('color', new THREE.BufferAttribute(sparkData.colors, 3))
    const sparkMaterial = new THREE.PointsMaterial({
      size: this.config.sparkSize,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.sparkPoints = new THREE.Points(sparkGeometry, sparkMaterial)

    const coreGeometry = new THREE.BufferGeometry()
    coreGeometry.setAttribute('position', new THREE.BufferAttribute(coreData.positions, 3))
    coreGeometry.setAttribute('color', new THREE.BufferAttribute(coreData.colors, 3))
    const coreMaterial = new THREE.PointsMaterial({
      size: this.config.coreSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.corePoints = new THREE.Points(coreGeometry, coreMaterial)

    this.scene.add(this.sparkPoints)
    this.scene.add(this.corePoints)
  }

  updateExplosion(delta) {
    this.explosionElapsed += delta
    const gravity = this.config.gravityStrength * delta
    const drag = Math.max(0.965, 1 - delta * this.config.dragStrength)

    const updateLayer = (points, velocities, life, fadeMultiplier) => {
      if (!points) return 0

      const positions = points.geometry.attributes.position.array
      let alive = 0

      for (let i = 0; i < velocities.length; i++) {
        const i3 = i * 3
        positions[i3] += velocities[i].x * delta
        positions[i3 + 1] += velocities[i].y * delta
        positions[i3 + 2] += velocities[i].z * delta

        velocities[i].multiplyScalar(drag)
        velocities[i].y -= gravity * fadeMultiplier
        life[i] -= delta * fadeMultiplier

        if (life[i] > 0) alive++
      }

      points.geometry.attributes.position.needsUpdate = true
      points.material.opacity = Math.max(0, Math.max(...life, 0))
      return alive
    }

    const sparkAlive = updateLayer(
      this.sparkPoints,
      this.sparkVelocities,
      this.sparkLife,
      this.config.sparkleFade,
    )
    const coreAlive = updateLayer(
      this.corePoints,
      this.coreVelocities,
      this.coreLife,
      this.config.coreFade,
    )

    if (this.sparkPoints) {
      this.sparkPoints.material.size = Math.max(
        0.06,
        this.config.sparkSize - this.explosionElapsed * 0.045,
      )
    }
    if (this.corePoints) {
      this.corePoints.material.size = Math.max(
        0.08,
        this.config.coreSize - this.explosionElapsed * 0.09,
      )
    }

    if (sparkAlive + coreAlive === 0 || this.explosionElapsed > this.explosionDuration) {
      this.disposeExplosion()
      this.isDone = true
    }
  }

  disposeExplosion() {
    if (this.sparkPoints) {
      this.scene.remove(this.sparkPoints)
      this.sparkPoints.geometry.dispose()
      this.sparkPoints.material.dispose()
      this.sparkPoints = null
    }
    if (this.corePoints) {
      this.scene.remove(this.corePoints)
      this.corePoints.geometry.dispose()
      this.corePoints.material.dispose()
      this.corePoints = null
    }
  }

  update(delta) {
    if (this.isDone) return
    if (!this.isExploded) {
      this.updateRocket(delta)
      return
    }
    this.updateExplosion(delta)
  }

  dispose() {
    if (this.rocket) {
      this.scene.remove(this.rocket)
      this.rocket.geometry.dispose()
      this.rocket.material.dispose()
    }
    if (this.trail) {
      this.scene.remove(this.trail)
      this.trail.geometry.dispose()
      this.trail.material.dispose()
    }
    this.disposeExplosion()
  }
}

export default function FireworkOverlay(props) {
  const containerRef = useRef(null)
  const rafRef = useRef(null)
  const intervalRef = useRef(null)
  const configRef = useRef(createConfig(props))
  configRef.current = createConfig(props)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const config = configRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      58,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100,
    )
    camera.position.z = config.cameraZ

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.pixelRatioCap))
    container.appendChild(renderer.domElement)

    const fireworks = []
    const clock = new THREE.Clock()

    function spawnFireworkCluster() {
      const burstCount = randomInt(...config.burstCountRange)
      const centerX = randomRange(...config.spawnXRange)

      for (let i = 0; i < burstCount; i++) {
        const spreadOffset =
          (i - (burstCount - 1) / 2) * randomRange(...config.clusterSpacingRange)
        const jitter = randomRange(...config.clusterJitterRange)
        const x = clamp(centerX + spreadOffset + jitter, ...config.worldXClamp)
        fireworks.push(new Firework(scene, config, x))
      }
    }

    spawnFireworkCluster()
    intervalRef.current = setInterval(spawnFireworkCluster, config.spawnIntervalMs)

    function animate() {
      rafRef.current = requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), 0.033) * config.deltaMultiplier

      for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update(delta)
        if (fireworks[i].isDone) {
          fireworks[i].dispose()
          fireworks.splice(i, 1)
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    function onResize() {
      const width = container.clientWidth
      const height = container.clientHeight
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fireworks.forEach((firework) => firework.dispose())
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [
    props.burstCountRange,
    props.cameraZ,
    props.clusterJitterRange,
    props.clusterSpacingRange,
    props.colors,
    props.coreCountRange,
    props.coreFade,
    props.coreSize,
    props.coreSpeedRange,
    props.coreSpread,
    props.deltaMultiplier,
    props.dragStrength,
    props.explosionDurationRange,
    props.gravityStrength,
    props.pixelRatioCap,
    props.rocketDurationRange,
    props.rocketOpacity,
    props.rocketSize,
    props.sparkCountRange,
    props.sparkleFade,
    props.sparkSize,
    props.sparkSpeedRange,
    props.sparkSpread,
    props.spawnIntervalMs,
    props.spawnXRange,
    props.startY,
    props.startZRange,
    props.tailLength,
    props.targetOffsetXRange,
    props.targetOffsetYRange,
    props.targetOffsetZRange,
    props.targetYRange,
    props.trailOpacity,
    props.trailSize,
    props.worldXClamp,
  ])

  const mergedStyle = {
    zIndex: props.zIndex ?? FIREWORK_OVERLAY_DEFAULTS.zIndex,
    ...props.style,
  }

  return (
    <div
      ref={containerRef}
      className={props.className ?? FIREWORK_OVERLAY_DEFAULTS.className}
      style={mergedStyle}
      aria-hidden
    />
  )
}
