import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import GSAP from 'gsap'
import { Pane } from 'tweakpane'

// ============================================================
// الترجمات
// ============================================================
const TRANSLATIONS = {
  ar: {
    'app-title':     '🤚 محاكي إيماءات اليد',
    'raised-hand':   '✋ يد مرفوعة',
    'raised-finger': '☝️ إصبع مرفوع',
    'rock-on':       '🤘 شارة الروك',
    'peace':         '✌️ علامة السلام',
    'hang-loose':    '🤙 شاكا',
    'fu':            '🖕 إصبع وسطى',
    'vulcan-salute': '🖖 تحية فولكان',
    'thumbs-up':     '👍 ممتاز',
    'thumbs-down':   '👎 سيئ',
    'ok-sign':       '👌 حسناً',
    'pointing':      '👉 إشارة',
    'fist':          '✊ قبضة',
    'open-palm':     '🖐️ كف مفتوح',
    'call-me':       '🤙 اتصل بي',
    'three-fingers': '🖖 ثلاثة',
    'i-love-you':    '🤟 أحبك',
    'crossed-fingers':'🤞 متقاطعة',
    'pinch':         '🤏 قرصة',
    'point-up':      '👆 للأعلى',
    'italian':       '🤌 إيطالية',
    'finger-heart':  '🫰 قلب',
    'screenshot':    '💾 حفظ الصورة',
    'lang-toggle':   '🌐 English',
    'settings-toggle': '⚙️ الإعدادات',
    'settings-close': '❌ إغلاق الإعدادات',
    'back-btn':      '↩️ رجوع',
    'created-by':    'صُنع بواسطة',
    'tab-hand':      'اليد 🤟',
    'tab-colors':    'الألوان 🎨',
    'folder-clench': 'قبض الأصابع',
    'folder-spread': 'فتح الأصابع (قيد التطوير)',
    'lbl-bg':        'الخلفية',
    'lbl-hand':      'اليد',
    'lbl-shirt':     'القميص',
    'lbl-vest':      'السترة',
    'lbl-wrist':     'الرسغ',
    'lbl-thumb':     'الإبهام',
    'lbl-index':     'السبابة',
    'lbl-middle':    'الوسطى',
    'lbl-ring':      'البنصر',
    'lbl-pinky':     'الخنصر',
    'lbl-thumbz':    'انتشار الإبهام',
    'lbl-indexz':    'انتشار السبابة',
    'lbl-middlez':   'انتشار الوسطى',
    'lbl-ringz':     'انتشار البنصر',
    'lbl-pinkyz':    'انتشار الخنصر',
    'loading':       '⏳ جاري تحميل النموذج...',
    'loading-error': '❌ فشل تحميل النموذج. تأكد من وجود hand.glb',
  },
  en: {
    'app-title':     '🤚 Hand Pose Simulator',
    'raised-hand':   '✋ Raised Hand',
    'raised-finger': '☝️ Raised Finger',
    'rock-on':       '🤘 Rock On',
    'peace':         '✌️ Peace',
    'hang-loose':    '🤙 Hang Loose',
    'fu':            '🖕 FU !!!!',
    'vulcan-salute': '🖖 Vulcan Salute',
    'thumbs-up':     '👍 Thumbs Up',
    'thumbs-down':   '👎 Thumbs Down',
    'ok-sign':       '👌 OK Sign',
    'pointing':      '👉 Pointing',
    'fist':          '✊ Fist',
    'open-palm':     '🖐️ Open Palm',
    'call-me':       '🤙 Call Me',
    'three-fingers': '🖖 Three Fingers',
    'i-love-you':    '🤟 I Love You',
    'crossed-fingers':'🤞 Crossed Fingers',
    'pinch':         '🤏 Pinch',
    'point-up':      '👆 Point Up',
    'italian':       '🤌 Italian',
    'finger-heart':  '🫰 Finger Heart',
    'screenshot':    '💾 Save Image',
    'lang-toggle':   '🌐 عربي',
    'settings-toggle': '⚙️ Settings',
    'settings-close': '❌ Close Settings',
    'back-btn':      '↩️ Back',
    'created-by':    'Created by',
    'tab-hand':      'Hand 🤟',
    'tab-colors':    'Colors 🎨',
    'folder-clench': 'Clench',
    'folder-spread': 'Spread (WIP)',
    'lbl-bg':        'Background',
    'lbl-hand':      'Hand',
    'lbl-shirt':     'Shirt',
    'lbl-vest':      'Vest',
    'lbl-wrist':     'Wrist',
    'lbl-thumb':     'Thumb',
    'lbl-index':     'Index',
    'lbl-middle':    'Middle',
    'lbl-ring':      'Ring',
    'lbl-pinky':     'Pinky',
    'lbl-thumbz':    'Thumb spread',
    'lbl-indexz':    'Index spread',
    'lbl-middlez':   'Middle spread',
    'lbl-ringz':     'Ring spread',
    'lbl-pinkyz':    'Pinky spread',
    'loading':       '⏳ Loading 3D model...',
    'loading-error': '❌ Failed to load model. Make sure hand.glb exists.',
  }
};

let currentLang = localStorage.getItem('lang') || 'ar';
const t = (key) => TRANSLATIONS[currentLang][key] || key;

// ============================================================
// عناصر الواجهة
// ============================================================
const paneElement = document.getElementById('pane');
const settingsBtn = document.getElementById('settings-toggle');
const backBtn = document.getElementById('back-btn');

// حالة الإعدادات (مغلقة افتراضياً)
let isSettingsOpen = false;

if (paneElement) paneElement.classList.add('hidden');

function updateSettingsButton() {
  if (!settingsBtn) return;
  if (isSettingsOpen) {
    settingsBtn.textContent = t('settings-close');
    if (paneElement) paneElement.classList.remove('hidden');
  } else {
    settingsBtn.textContent = t('settings-toggle');
    if (paneElement) paneElement.classList.add('hidden');
  }
}
updateSettingsButton();

if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    isSettingsOpen = !isSettingsOpen;
    updateSettingsButton();
  });
}

// زر الرجوع
if (backBtn) {
  backBtn.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'https://alostoura-official.github.io/';
    }
  });
}

// ============================================================
// Tweakpane
// ============================================================
const pane = new Pane({ container: document.getElementById('pane') })
let paneState = { tab: null, clench: null, spread: null }

// ============================================================
// PARAMS
// ============================================================
const PARAMS = {
  bg: 0x4b46b2,
  hand: 0xE7A183,
  shirt: 0x303030,
  vest: 0xE7D55C,
  wrist: 0.1,
  thumb: 0.25,
  index: 0.25,
  middle: 1.1,
  ring: 1.1,
  pinky: 0.25,
  thumbz: -0.15,
  indexz: -0.3,
  middlez: -0.08,
  ringz: -0.22,
  pinkyz: -0.52
}

// ============================================================
// المشهد
// ============================================================
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
scene.background = new THREE.Color(PARAMS.bg)

// ============================================================
// تحميل النموذج
// ============================================================
const loadingOverlay = document.getElementById('loading-overlay')
const loadingText = document.getElementById('loading-text')
if (loadingText) loadingText.textContent = t('loading')

const gltfLoader = new GLTFLoader()
THREE.Cache.enabled = true

gltfLoader.load(
  'hand.glb',
  (gltf) => {
    scene.add(gltf.scene.children[0])
    setMaterials()
    setBones()
    setTimeout(() => {
      if (loadingOverlay) loadingOverlay.classList.add('hidden')
    }, 300)
  },
  (xhr) => {
    if (xhr.total > 0 && loadingText) {
      const percent = Math.round((xhr.loaded / xhr.total) * 100)
      loadingText.textContent = `${t('loading')} (${percent}%)`
    }
  },
  (error) => {
    console.error('❌ خطأ في تحميل النموذج:', error)
    if (loadingText) {
      loadingText.textContent = t('loading-error')
      loadingText.style.color = '#f87171'
      const retryBtn = document.createElement('button')
      retryBtn.textContent = '🔄 إعادة المحاولة'
      retryBtn.style.cssText = `margin-top: 1rem; padding: 0.5rem 1.5rem; background: #fff; color: #333; border: none; border-radius: 999px; cursor: pointer; font-family: 'Cairo', sans-serif; font-weight: bold;`
      retryBtn.onclick = () => location.reload()
      loadingText.appendChild(document.createElement('br'))
      loadingText.appendChild(retryBtn)
    }
  }
)

// ============================================================
// المواد
// ============================================================
const handMaterial = new THREE.MeshToonMaterial()
const shirtMaterial = new THREE.MeshToonMaterial()
const vestMaterial = new THREE.MeshToonMaterial()

const setMaterials = () => {
  const textureLoader = new THREE.TextureLoader()
  const gradientTexture = textureLoader.load('3.jpg')
  gradientTexture.minFilter = THREE.NearestFilter
  gradientTexture.magFilter = THREE.NearestFilter
  gradientTexture.generateMipmaps = false

  handMaterial.color = new THREE.Color(PARAMS.hand)
  handMaterial.gradientMap = gradientTexture
  handMaterial.roughness = 0.7
  handMaterial.emissive = new THREE.Color(PARAMS.hand)
  handMaterial.emissiveIntensity = 0.2
  scene.getObjectByName('Hand').material = handMaterial

  shirtMaterial.color = new THREE.Color(PARAMS.shirt)
  shirtMaterial.gradientMap = gradientTexture
  scene.getObjectByName('Shirt').material = shirtMaterial

  vestMaterial.color = new THREE.Color(PARAMS.vest)
  vestMaterial.gradientMap = gradientTexture
  scene.getObjectByName('Vest').material = vestMaterial
}

// ============================================================
// دالة مساعدة للحركة
// ============================================================
function animatePose(config, buttonId) {
  document.querySelectorAll('.poses button').forEach(b => b.classList.remove('active'))
  const activeBtn = document.getElementById(buttonId)
  if (activeBtn) {
    activeBtn.classList.add('active')
    setTimeout(() => activeBtn.classList.remove('active'), 1000)
  }

  const tl = GSAP.timeline()
  tl.to(PARAMS, { duration: 0, ...config.params }, 'same')
    .to(config.rot.wrist,  { duration: 0.5, x: config.pose.wrist },  'same')
    .to(config.rot.thumb,  { duration: 0.5, x: config.pose.thumb, z: config.pose.thumbz }, 'same')
    .to(config.rot.index,  { duration: 0.5, x: config.pose.index }, 'same')
    .to(config.rot.index[0], { duration: 0.5, z: config.pose.indexz }, 'same')
    .to(config.rot.middle, { duration: 0.5, x: config.pose.middle }, 'same')
    .to(config.rot.middle[0], { duration: 0.5, z: config.pose.middlez }, 'same')
    .to(config.rot.ring,   { duration: 0.5, x: config.pose.ring }, 'same')
    .to(config.rot.ring[0], { duration: 0.5, z: config.pose.ringz }, 'same')
    .to(config.rot.pinky,  { duration: 0.5, x: config.pose.pinky }, 'same')
    .to(config.rot.pinky[0], { duration: 0.5, z: config.pose.pinkyz }, 'same')
    .to(scene.background,  { duration: 0.5, r: config.bg.r, g: config.bg.g, b: config.bg.b }, 'same')
    .to(handMaterial.color, { duration: 0.5, r: config.hand.r, g: config.hand.g, b: config.hand.b }, 'same')
    .to(handMaterial.emissive, { duration: 0.5, r: config.hand.r, g: config.hand.g, b: config.hand.b }, 'same')
    .to(shirtMaterial.color, { duration: 0.5, r: config.shirt.r, g: config.shirt.g, b: config.shirt.b }, 'same')
    .to(vestMaterial.color, { duration: 0.5, r: config.vest.r, g: config.vest.g, b: config.vest.b }, 'same')
    .call(() => pane.refresh())
    .play()
}

// ============================================================
// setBones
// ============================================================
const setBones = () => {
  const b = scene.getObjectByName('Hand').skeleton.bones

  const wrist = b[0], wrist1 = b[1], wrist2 = b[2],
        wrist3 = b[6], wrist4 = b[10], wrist5 = b[14], wrist6 = b[18]
  const thumb1 = b[3], thumb2 = b[4], thumb3 = b[5]
  const index1 = b[7], index2 = b[8], index3 = b[9]
  const middle1 = b[11], middle2 = b[12], middle3 = b[13]
  const ring1 = b[15], ring2 = b[16], ring3 = b[17]
  const pinky1 = b[19], pinky2 = b[20], pinky3 = b[21]

  ;[wrist1, wrist2, wrist3, wrist4, wrist5, wrist6].forEach(w => w.rotation.x = PARAMS.wrist)
  ;[thumb1, thumb2, thumb3].forEach(t => { t.rotation.x = PARAMS.thumb; t.rotation.z = PARAMS.thumbz })
  ;[index1, index2, index3].forEach(i => i.rotation.x = PARAMS.index)
  index1.rotation.z = PARAMS.indexz
  ;[middle1, middle2, middle3].forEach(m => m.rotation.x = PARAMS.middle)
  middle1.rotation.z = PARAMS.middlez
  ;[ring1, ring2, ring3].forEach(r => r.rotation.x = PARAMS.ring)
  ring1.rotation.z = -PARAMS.ringz
  ;[pinky1, pinky2, pinky3].forEach(p => p.rotation.x = PARAMS.pinky)
  pinky1.rotation.z = -PARAMS.pinkyz

  const wristRotations = [wrist.rotation, wrist1.rotation, wrist2.rotation, wrist3.rotation, wrist4.rotation, wrist5.rotation, wrist6.rotation]
  const thumbRotations = [thumb1.rotation, thumb2.rotation, thumb3.rotation]
  const indexRotations = [index1.rotation, index2.rotation, index3.rotation]
  const middleRotations = [middle1.rotation, middle2.rotation, middle3.rotation]
  const ringRotations   = [ring1.rotation, ring2.rotation, ring3.rotation]
  const pinkyRotations  = [pinky1.rotation, pinky2.rotation, pinky3.rotation]

  // بناء Tweakpane
  paneState.tab = pane.addTab({ pages: [{ title: t('tab-hand') }, { title: t('tab-colors') }] })
  paneState.clench = paneState.tab.pages[0].addFolder({ title: t('folder-clench'), expanded: true })
  paneState.spread = paneState.tab.pages[0].addFolder({ title: t('folder-spread'), expanded: true })

  // الألوان
  paneState.tab.pages[1].addInput(PARAMS, 'bg', { label: t('lbl-bg'), view: 'color', picker: 'inline', expanded: false })
    .on('change', (ev) => { scene.background = new THREE.Color(ev.value); document.body.style.backgroundColor = ev.value })
  paneState.tab.pages[1].addInput(PARAMS, 'hand', { label: t('lbl-hand'), view: 'color', picker: 'inline', expanded: false })
    .on('change', (ev) => { handMaterial.color = new THREE.Color(ev.value); handMaterial.emissive = new THREE.Color(PARAMS.hand) })
  paneState.tab.pages[1].addInput(PARAMS, 'shirt', { label: t('lbl-shirt'), view: 'color', picker: 'inline', expanded: false })
    .on('change', (ev) => { shirtMaterial.color = new THREE.Color(ev.value) })
  paneState.tab.pages[1].addInput(PARAMS, 'vest', { label: t('lbl-vest'), view: 'color', picker: 'inline', expanded: false })
    .on('change', (ev) => { vestMaterial.color = new THREE.Color(ev.value) })

  // الشرائح
  paneState.clench.addInput(PARAMS, 'wrist', { label: t('lbl-wrist'), min: -0.4, max: 0.4, step: 0.01 })
    .on('change', (ev) => wristRotations.forEach(r => r.x = ev.value))
  paneState.clench.addInput(PARAMS, 'thumb', { label: t('lbl-thumb'), min: 0, max: 0.9, step: 0.01 })
    .on('change', (ev) => thumbRotations.forEach(r => r.x = ev.value))
  paneState.spread.addInput(PARAMS, 'thumbz', { label: t('lbl-thumbz'), min: -0.4, max: 0.3, step: 0.01 })
    .on('change', (ev) => thumbRotations.forEach(r => r.z = ev.value))
  paneState.clench.addInput(PARAMS, 'index', { label: t('lbl-index'), min: 0, max: 1.1, step: 0.01 })
    .on('change', (ev) => indexRotations.forEach(r => r.x = ev.value))
  paneState.spread.addInput(PARAMS, 'indexz', { label: t('lbl-indexz'), min: -0.5, max: 0, step: 0.01 })
    .on('change', (ev) => indexRotations[0].z = ev.value)
  paneState.clench.addInput(PARAMS, 'middle', { label: t('lbl-middle'), min: 0, max: 1.25, step: 0.01 })
    .on('change', (ev) => middleRotations.forEach(r => r.x = ev.value))
  paneState.spread.addInput(PARAMS, 'middlez', { label: t('lbl-middlez'), min: -0.35, max: 0.25, step: 0.01 })
    .on('change', (ev) => middleRotations[0].z = ev.value)
  paneState.clench.addInput(PARAMS, 'ring', { label: t('lbl-ring'), min: 0, max: 1.25, step: 0.01 })
    .on('change', (ev) => ringRotations.forEach(r => r.x = ev.value))
  paneState.spread.addInput(PARAMS, 'ringz', { label: t('lbl-ringz'), min: -0.4, max: 0.2, step: 0.01 })
    .on('change', (ev) => ringRotations[0].z = -ev.value)
  paneState.clench.addInput(PARAMS, 'pinky', { label: t('lbl-pinky'), min: 0, max: 1.15, step: 0.01 })
    .on('change', (ev) => pinkyRotations.forEach(r => r.x = ev.value))
  paneState.spread.addInput(PARAMS, 'pinkyz', { label: t('lbl-pinkyz'), min: -0.52, max: -0.25, step: 0.01 })
    .on('change', (ev) => pinkyRotations[0].z = -ev.value)

  const rot = { wrist: wristRotations, thumb: thumbRotations, index: indexRotations, middle: middleRotations, ring: ringRotations, pinky: pinkyRotations }

  const POSES = {
    'raised-hand': {
      params: { bg: 0xbcbcbc, hand: 0xc5c5c5, shirt: 0x666666, vest: 0x191919, wrist: 0, thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0, thumbz: -0.15, indexz: -0.30, middlez: -0.08, ringz: -0.22, pinkyz: -0.52 },
      pose: { wrist: 0, thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0, thumbz: -0.15, indexz: -0.30, middlez: -0.08, ringz: 0.22, pinkyz: 0.52 },
      bg: new THREE.Color(0xbcbcbc), hand: new THREE.Color(0xc5c5c5), shirt: new THREE.Color(0x666666), vest: new THREE.Color(0x191919),
    },
    'raised-finger': {
      params: { bg: 0xaf5f54, hand: 0xe7a183, shirt: 0xc7d2eb, vest: 0x274479, wrist: 0, thumb: 0.9, index: 0, middle: 1.25, ring: 1.25, pinky: 1.15, thumbz: -0.15, indexz: -0.30, middlez: -0.08, ringz: -0.22, pinkyz: -0.52 },
      pose: { wrist: 0, thumb: 0.9, index: 0, middle: 1.25, ring: 1.25, pinky: 1.15, thumbz: -0.15, indexz: -0.30, middlez: -0.08, ringz: 0.22, pinkyz: 0.52 },
      bg: new THREE.Color(0xaf5f54), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0xc7d2eb), vest: new THREE.Color(0x274479),
    },
    'rock-on': {
      params: { bg: 0x4b46b2, hand: 0xe7a183, shirt: 0x303030, vest: 0xe7d55c, wrist: 0.1, thumb: 0.25, index: 0.25, middle: 1.1, ring: 1.1, pinky: 0.25, thumbz: -0.15, indexz: -0.30, middlez: -0.08, ringz: -0.22, pinkyz: -0.52 },
      pose: { wrist: 0.1, thumb: 0.25, index: 0.25, middle: 1.1, ring: 1.1, pinky: 0.25, thumbz: -0.15, indexz: -0.30, middlez: -0.08, ringz: 0.22, pinkyz: 0.52 },
      bg: new THREE.Color(0x4b46b2), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x303030), vest: new THREE.Color(0xe7d55c),
    },
    'peace': {
      params: { bg: 0xe2ceab, hand: 0x624122, shirt: 0xccb4a2, vest: 0xbf6f30, wrist: 0, thumb: 0.9, index: 0, middle: 0, ring: 1.25, pinky: 1.15, thumbz: -0.15, indexz: -0.03, middlez: -0.23, ringz: -0.22, pinkyz: -0.52 },
      pose: { wrist: 0, thumb: 0.9, index: 0, middle: 0, ring: 1.25, pinky: 1.15, thumbz: -0.15, indexz: -0.03, middlez: -0.23, ringz: 0.22, pinkyz: 0.52 },
      bg: new THREE.Color(0xe2ceab), hand: new THREE.Color(0x624122), shirt: new THREE.Color(0xccb4a2), vest: new THREE.Color(0xbf6f30),
    },
    'hang-loose': {
      params: { bg: 0x1389d8, hand: 0xb69621, shirt: 0xbbdae8, vest: 0xbf3131, wrist: 0, thumb: 0, index: 1.1, middle: 1.25, ring: 1.25, pinky: 0, thumbz: -0.04, indexz: -0.30, middlez: -0.08, ringz: -0.22, pinkyz: -0.25 },
      pose: { wrist: 0, thumb: 0, index: 1.1, middle: 1.25, ring: 1.25, pinky: 0, thumbz: -0.04, indexz: -0.30, middlez: -0.08, ringz: 0.22, pinkyz: 0.25 },
      bg: new THREE.Color(0x1389d8), hand: new THREE.Color(0xb69621), shirt: new THREE.Color(0xbbdae8), vest: new THREE.Color(0xbf3131),
    },
    'fu': {
      params: { bg: 0x156259, hand: 0xc1b7e5, shirt: 0x568f46, vest: 0x822bc2, wrist: 0, thumb: 0.9, index: 1.1, middle: 0, ring: 1.25, pinky: 1.15, thumbz: -0.15, indexz: -0.30, middlez: -0.08, ringz: -0.22, pinkyz: -0.52 },
      pose: { wrist: 0, thumb: 0.9, index: 1.1, middle: 0, ring: 1.25, pinky: 1.15, thumbz: -0.15, indexz: -0.30, middlez: -0.08, ringz: 0.22, pinkyz: 0.52 },
      bg: new THREE.Color(0x156259), hand: new THREE.Color(0xc1b7e5), shirt: new THREE.Color(0x568f46), vest: new THREE.Color(0x822bc2),
    },
    'vulcan-salute': {
      params: { bg: 0x000000, hand: 0x1c7f56, shirt: 0x922323, vest: 0xb1c8c2, wrist: 0, thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0, thumbz: 0.08, indexz: -0.05, middlez: 0.22, ringz: 0.04, pinkyz: -0.34 },
      pose: { wrist: 0, thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0, thumbz: 0.08, indexz: -0.05, middlez: 0.22, ringz: -0.04, pinkyz: 0.34 },
      bg: new THREE.Color(0x000000), hand: new THREE.Color(0x1c7f56), shirt: new THREE.Color(0x922323), vest: new THREE.Color(0xb1c8c2),
    },
    'thumbs-up': {
      params: { bg: 0x22c55e, hand: 0xe7a183, shirt: 0x303030, vest: 0x10b981, wrist: 0, thumb: 0, index: 1.1, middle: 1.25, ring: 1.25, pinky: 1.15, thumbz: 0.1, indexz: -0.30, middlez: -0.08, ringz: -0.22, pinkyz: -0.52 },
      pose: { wrist: 0, thumb: 0, index: 1.1, middle: 1.25, ring: 1.25, pinky: 1.15, thumbz: 0.1, indexz: -0.30, middlez: -0.08, ringz: 0.22, pinkyz: 0.52 },
      bg: new THREE.Color(0x22c55e), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x303030), vest: new THREE.Color(0x10b981),
    },
    'thumbs-down': {
      params: { bg: 0xdc2626, hand: 0xe7a183, shirt: 0x303030, vest: 0x7f1d1d, wrist: 0, thumb: 0.9, index: 1.1, middle: 1.25, ring: 1.25, pinky: 1.15, thumbz: -0.3, indexz: -0.30, middlez: -0.08, ringz: -0.22, pinkyz: -0.52 },
      pose: { wrist: 0, thumb: 0.9, index: 1.1, middle: 1.25, ring: 1.25, pinky: 1.15, thumbz: -0.3, indexz: -0.30, middlez: -0.08, ringz: 0.22, pinkyz: 0.52 },
      bg: new THREE.Color(0xdc2626), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x303030), vest: new THREE.Color(0x7f1d1d),
    },
    'ok-sign': {
      params: { bg: 0xeab308, hand: 0xe7a183, shirt: 0x1f2937, vest: 0xfbbf24, wrist: 0, thumb: 0.7, index: 0.7, middle: 0, ring: 0, pinky: 0, thumbz: 0.05, indexz: -0.4, middlez: -0.1, ringz: -0.2, pinkyz: -0.5 },
      pose: { wrist: 0, thumb: 0.7, index: 0.7, middle: 0, ring: 0, pinky: 0, thumbz: 0.05, indexz: -0.4, middlez: -0.1, ringz: 0.2, pinkyz: 0.5 },
      bg: new THREE.Color(0xeab308), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x1f2937), vest: new THREE.Color(0xfbbf24),
    },
    'pointing': {
      params: { bg: 0x0ea5e9, hand: 0xe7a183, shirt: 0x1f2937, vest: 0x0891b2, wrist: 0, thumb: 0.9, index: 0, middle: 1.1, ring: 1.25, pinky: 1.15, thumbz: -0.2, indexz: -0.15, middlez: -0.08, ringz: -0.22, pinkyz: -0.52 },
      pose: { wrist: 0, thumb: 0.9, index: 0, middle: 1.1, ring: 1.25, pinky: 1.15, thumbz: -0.2, indexz: -0.15, middlez: -0.08, ringz: 0.22, pinkyz: 0.52 },
      bg: new THREE.Color(0x0ea5e9), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x1f2937), vest: new THREE.Color(0x0891b2),
    },
    'fist': {
      params: { bg: 0x64748b, hand: 0xe7a183, shirt: 0x1f2937, vest: 0x334155, wrist: 0, thumb: 0.9, index: 1.1, middle: 1.25, ring: 1.25, pinky: 1.15, thumbz: -0.1, indexz: -0.30, middlez: -0.08, ringz: -0.22, pinkyz: -0.52 },
      pose: { wrist: 0, thumb: 0.9, index: 1.1, middle: 1.25, ring: 1.25, pinky: 1.15, thumbz: -0.1, indexz: -0.30, middlez: -0.08, ringz: 0.22, pinkyz: 0.52 },
      bg: new THREE.Color(0x64748b), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x1f2937), vest: new THREE.Color(0x334155),
    },
    'open-palm': {
      params: { bg: 0x14b8a6, hand: 0xe7a183, shirt: 0x1f2937, vest: 0x0d9488, wrist: 0, thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0, thumbz: -0.3, indexz: -0.4, middlez: -0.1, ringz: -0.15, pinkyz: -0.45 },
      pose: { wrist: 0, thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0, thumbz: -0.3, indexz: -0.4, middlez: -0.1, ringz: 0.15, pinkyz: 0.45 },
      bg: new THREE.Color(0x14b8a6), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x1f2937), vest: new THREE.Color(0x0d9488),
    },
    'call-me': {
      params: { bg: 0xa855f7, hand: 0xe7a183, shirt: 0x1f2937, vest: 0x7e22ce, wrist: 0, thumb: 0, index: 1.1, middle: 1.25, ring: 1.25, pinky: 0, thumbz: -0.4, indexz: -0.30, middlez: -0.08, ringz: -0.22, pinkyz: -0.3 },
      pose: { wrist: 0, thumb: 0, index: 1.1, middle: 1.25, ring: 1.25, pinky: 0, thumbz: -0.4, indexz: -0.30, middlez: -0.08, ringz: 0.22, pinkyz: 0.3 },
      bg: new THREE.Color(0xa855f7), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x1f2937), vest: new THREE.Color(0x7e22ce),
    },
    'three-fingers': {
      params: { bg: 0xf97316, hand: 0xe7a183, shirt: 0x1f2937, vest: 0xc2410c, wrist: 0, thumb: 0.9, index: 0, middle: 0, ring: 0, pinky: 1.15, thumbz: -0.15, indexz: -0.15, middlez: -0.05, ringz: -0.1, pinkyz: -0.52 },
      pose: { wrist: 0, thumb: 0.9, index: 0, middle: 0, ring: 0, pinky: 1.15, thumbz: -0.15, indexz: -0.15, middlez: -0.05, ringz: 0.1, pinkyz: 0.52 },
      bg: new THREE.Color(0xf97316), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x1f2937), vest: new THREE.Color(0xc2410c),
    },
    'i-love-you': {
      params: { bg: 0xf43f5e, hand: 0xe7a183, shirt: 0x1f2937, vest: 0xbe123c, wrist: 0, thumb: 0, index: 0, middle: 1.25, ring: 1.25, pinky: 0, thumbz: -0.3, indexz: -0.2, middlez: -0.08, ringz: -0.22, pinkyz: -0.4 },
      pose: { wrist: 0, thumb: 0, index: 0, middle: 1.25, ring: 1.25, pinky: 0, thumbz: -0.3, indexz: -0.2, middlez: -0.08, ringz: 0.22, pinkyz: 0.4 },
      bg: new THREE.Color(0xf43f5e), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x1f2937), vest: new THREE.Color(0xbe123c),
    },
    'crossed-fingers': {
      params: { bg: 0x84cc16, hand: 0xe7a183, shirt: 0x1f2937, vest: 0x4d7c0f, wrist: 0, thumb: 0.9, index: 0, middle: 0, ring: 1.25, pinky: 1.15, thumbz: -0.15, indexz: -0.05, middlez: -0.15, ringz: -0.22, pinkyz: -0.52 },
      pose: { wrist: 0, thumb: 0.9, index: 0, middle: 0, ring: 1.25, pinky: 1.15, thumbz: -0.15, indexz: -0.05, middlez: -0.15, ringz: 0.22, pinkyz: 0.52 },
      bg: new THREE.Color(0x84cc16), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x1f2937), vest: new THREE.Color(0x4d7c0f),
    },
    'pinch': {
      params: { bg: 0xd946ef, hand: 0xe7a183, shirt: 0x1f2937, vest: 0xa21caf, wrist: 0, thumb: 0.85, index: 0.85, middle: 0.3, ring: 0.3, pinky: 0.3, thumbz: 0.05, indexz: -0.4, middlez: -0.1, ringz: -0.15, pinkyz: -0.4 },
      pose: { wrist: 0, thumb: 0.85, index: 0.85, middle: 0.3, ring: 0.3, pinky: 0.3, thumbz: 0.05, indexz: -0.4, middlez: -0.1, ringz: 0.15, pinkyz: 0.4 },
      bg: new THREE.Color(0xd946ef), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x1f2937), vest: new THREE.Color(0xa21caf),
    },
    'point-up': {
      params: { bg: 0x0d9488, hand: 0xe7a183, shirt: 0x1f2937, vest: 0x115e59, wrist: 0, thumb: 0.9, index: 0, middle: 1.1, ring: 1.25, pinky: 1.15, thumbz: -0.2, indexz: -0.1, middlez: -0.08, ringz: -0.22, pinkyz: -0.52 },
      pose: { wrist: 0, thumb: 0.9, index: 0, middle: 1.1, ring: 1.25, pinky: 1.15, thumbz: -0.2, indexz: -0.1, middlez: -0.08, ringz: 0.22, pinkyz: 0.52 },
      bg: new THREE.Color(0x0d9488), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x1f2937), vest: new THREE.Color(0x115e59),
    },
    'italian': {
      params: { bg: 0xfbbf24, hand: 0xe7a183, shirt: 0x1f2937, vest: 0xd97706, wrist: 0, thumb: 0.7, index: 0.7, middle: 0.7, ring: 0.7, pinky: 0.7, thumbz: 0.0, indexz: -0.25, middlez: -0.1, ringz: -0.15, pinkyz: -0.35 },
      pose: { wrist: 0, thumb: 0.7, index: 0.7, middle: 0.7, ring: 0.7, pinky: 0.7, thumbz: 0.0, indexz: -0.25, middlez: -0.1, ringz: 0.15, pinkyz: 0.35 },
      bg: new THREE.Color(0xfbbf24), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x1f2937), vest: new THREE.Color(0xd97706),
    },
    'finger-heart': {
      params: { bg: 0xfb7185, hand: 0xe7a183, shirt: 0x1f2937, vest: 0xe11d48, wrist: 0, thumb: 0.6, index: 0.6, middle: 1.1, ring: 1.25, pinky: 1.15, thumbz: 0.0, indexz: -0.35, middlez: -0.08, ringz: -0.22, pinkyz: -0.52 },
      pose: { wrist: 0, thumb: 0.6, index: 0.6, middle: 1.1, ring: 1.25, pinky: 1.15, thumbz: 0.0, indexz: -0.35, middlez: -0.08, ringz: 0.22, pinkyz: 0.52 },
      bg: new THREE.Color(0xfb7185), hand: new THREE.Color(0xe7a183), shirt: new THREE.Color(0x1f2937), vest: new THREE.Color(0xe11d48),
    },
  }

  Object.entries(POSES).forEach(([key, config]) => {
    const btn = document.getElementById(key)
    if (!btn) return
    btn.addEventListener('click', () => animatePose({ ...config, rot }, key))
  })
}

// ============================================================
// الإضاءة
// ============================================================
scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const dirLight = new THREE.DirectionalLight(0xffffff, 2)
dirLight.position.set(-5, 5, 5)
scene.add(dirLight)

// ============================================================
// الأحجام والكاميرا
// ============================================================
const sizes = { width: window.innerWidth, height: window.innerHeight }

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, 5)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0, 0)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2
controls.minDistance = 3
controls.maxDistance = 10

// ============================================================
// المصيّر
// ============================================================
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const outlineEffect = new OutlineEffect(renderer, {
  defaultThickness: 0.0035,
  defaultColor: [0, 0, 0],
  defaultAlpha: 0.8,
  defaultKeepAlive: true
})

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()
  outlineEffect.setSize(sizes.width, sizes.height)
  outlineEffect.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// ============================================================
// حفظ الصورة
// ============================================================
document.querySelector('#screenshot').addEventListener('click', () => {
  outlineEffect.render(scene, camera)
  canvas.toBlob((blob) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `screencapture-${canvas.width}x${canvas.height}.png`
    a.click()
  })
})

// ============================================================
// حلقة الرسم
// ============================================================
const clock = new THREE.Clock()
const tick = () => {
  clock.getElapsedTime()
  controls.update()
  outlineEffect.render(scene, camera)
  requestAnimationFrame(tick)
}
tick()

// ============================================================
// تبديل اللغة
// ============================================================
function applyLanguage(lang) {
  currentLang = lang
  localStorage.setItem('lang', lang)
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'

  const appTitle = document.getElementById('app-title')
  if (appTitle) appTitle.textContent = t('app-title')

  const ids = [
    'raised-hand', 'raised-finger', 'rock-on', 'peace', 'hang-loose', 'fu', 'vulcan-salute',
    'thumbs-up', 'thumbs-down', 'ok-sign', 'pointing', 'fist', 'open-palm', 'call-me', 'three-fingers',
    'i-love-you', 'crossed-fingers', 'pinch', 'point-up', 'italian', 'finger-heart',
    'screenshot', 'lang-toggle', 'back-btn'
  ]
  ids.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.textContent = t(id)
  })

  const createdBy = document.getElementById('created-by')
  if (createdBy) createdBy.textContent = t('created-by')

  if (loadingText && loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
    loadingText.textContent = t('loading')
  }

  try {
    while (pane.children.length > 0) pane.children[0].dispose()
  } catch (e) {}

  if (scene.getObjectByName('Hand')) {
    setMaterials()
    setBones()
  }

  updateSettingsButton()
}

document.getElementById('lang-toggle').addEventListener('click', () => {
  applyLanguage(currentLang === 'ar' ? 'en' : 'ar')
})

applyLanguage(currentLang)