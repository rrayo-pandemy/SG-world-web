import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export function mountHero3D(host) {
    var hero = host.closest('.world-hero');
    if (!hero || host.dataset.initialized === 'true' || !('IntersectionObserver' in window)) return;

    var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    var dataPreference = window.matchMedia('(prefers-reduced-data: reduce)');
    if (motionPreference.matches || dataPreference.matches) return;

    var renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: false,
            failIfMajorPerformanceCaveat: true,
            powerPreference: 'low-power'
        });
    } catch (_error) {
        return;
    }

    host.dataset.initialized = 'true';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.transmissionResolutionScale = 0.5;

    var canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(3.9, 3.15, 6.4);
    camera.lookAt(0, 0, 0);

    // Three-point studio lighting; only the key light casts the fitted shadow map.
    scene.add(new THREE.AmbientLight(0xf2f4e8, 0.28));
    var keyLight = new THREE.DirectionalLight(0xfff2d9, 3.1);
    keyLight.position.set(-3.8, 5.8, 5.4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -3.2;
    keyLight.shadow.camera.right = 3.2;
    keyLight.shadow.camera.top = 4.2;
    keyLight.shadow.camera.bottom = -2.8;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 16;
    keyLight.shadow.bias = -0.00025;
    keyLight.shadow.normalBias = 0.035;
    keyLight.shadow.radius = 3;
    scene.add(keyLight);
    scene.add(keyLight.target);
    var fillLight = new THREE.DirectionalLight(0xa9c4ad, 1.55);
    fillLight.position.set(4.5, 2.3, 4.2);
    scene.add(fillLight);
    var rimLight = new THREE.DirectionalLight(0xd9f4d8, 2.5);
    rimLight.position.set(0.6, 4.2, -4.5);
    scene.add(rimLight);

    var cutaway = new THREE.Group();
    var upAxis = new THREE.Vector3(0, 1, 0);

    var architectureMaterial = new THREE.MeshStandardMaterial({
        color: 0x969b8e,
        emissive: 0x171c17,
        emissiveIntensity: 0.07,
        metalness: 0.04,
        roughness: 0.78,
        envMapIntensity: 0.45
    });
    var wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x718178,
        emissive: 0x121b16,
        emissiveIntensity: 0.06,
        metalness: 0.12,
        roughness: 0.62,
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
        depthWrite: false,
        envMapIntensity: 0.55
    });
    var glazingMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x6c9383,
        metalness: 0.18,
        roughness: 0.18,
        transmission: 0.12,
        thickness: 0.08,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
        depthWrite: false,
        envMapIntensity: 0.85
    });
    var steelMaterial = new THREE.MeshStandardMaterial({
        color: 0x87958b,
        emissive: 0x111b15,
        emissiveIntensity: 0.05,
        metalness: 0.72,
        roughness: 0.28,
        envMapIntensity: 0.9
    });
    var rebarMaterial = new THREE.MeshStandardMaterial({
        color: 0x9a907c,
        metalness: 0.68,
        roughness: 0.34,
        envMapIntensity: 0.7
    });
    var waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x57aaa1,
        emissive: 0x124943,
        emissiveIntensity: 0.16,
        metalness: 0.36,
        roughness: 0.29,
        envMapIntensity: 0.8
    });
    var electricalMaterial = new THREE.MeshStandardMaterial({
        color: 0xd4f542,
        emissive: 0x526619,
        emissiveIntensity: 0.18,
        metalness: 0.38,
        roughness: 0.27,
        envMapIntensity: 0.55
    });
    var trayMaterial = new THREE.MeshStandardMaterial({
        color: 0x48564d,
        metalness: 0.7,
        roughness: 0.32,
        envMapIntensity: 0.8
    });
    var rackMaterial = new THREE.MeshStandardMaterial({
        color: 0x202d26,
        metalness: 0.72,
        roughness: 0.3,
        envMapIntensity: 0.75
    });
    var portMaterial = new THREE.MeshStandardMaterial({
        color: 0x9db9ac,
        metalness: 0.46,
        roughness: 0.24,
        envMapIntensity: 0.7
    });
    var cableMaterials = [
        new THREE.MeshStandardMaterial({ color: 0x39c5c5, emissive: 0x0d4444, emissiveIntensity: 0.12, metalness: 0.12, roughness: 0.3, envMapIntensity: 0.5 }),
        new THREE.MeshStandardMaterial({ color: 0x5a89e8, emissive: 0x162c61, emissiveIntensity: 0.12, metalness: 0.12, roughness: 0.31, envMapIntensity: 0.5 }),
        new THREE.MeshStandardMaterial({ color: 0xd4f542, emissive: 0x455318, emissiveIntensity: 0.1, metalness: 0.12, roughness: 0.32, envMapIntensity: 0.5 })
    ];

    var boxGeometryCache = Object.create(null);
    var pipeGeometryCache = Object.create(null);
    var jointGeometryCache = Object.create(null);

    function addBox(parent, size, position, material, castsShadow) {
        var key = size.join('x');
        var geometry = boxGeometryCache[key] || (boxGeometryCache[key] = new THREE.BoxGeometry(size[0], size[1], size[2]));
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position[0], position[1], position[2]);
        mesh.castShadow = castsShadow === true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }

    function addPipe(parent, start, end, radius, material, castsShadow) {
        var from = new THREE.Vector3(start[0], start[1], start[2]);
        var to = new THREE.Vector3(end[0], end[1], end[2]);
        var direction = to.clone().sub(from);
        var length = direction.length();
        var key = radius + 'x' + length.toFixed(3);
        var geometry = pipeGeometryCache[key] || (
            pipeGeometryCache[key] = new THREE.CylinderGeometry(radius, radius, length, 8, 1)
        );
        var pipe = new THREE.Mesh(
            geometry,
            material
        );
        pipe.position.copy(from).add(to).multiplyScalar(0.5);
        pipe.quaternion.setFromUnitVectors(upAxis, direction.normalize());
        pipe.castShadow = castsShadow === true;
        pipe.receiveShadow = true;
        parent.add(pipe);
        return pipe;
    }

    function addJoint(parent, position, radius, material) {
        var key = String(radius);
        var geometry = jointGeometryCache[key] || (
            jointGeometryCache[key] = new THREE.SphereGeometry(radius, 10, 8)
        );
        var joint = new THREE.Mesh(geometry, material);
        joint.position.set(position[0], position[1], position[2]);
        joint.castShadow = false;
        joint.receiveShadow = true;
        parent.add(joint);
    }

    // Open three-storey frame: the exposed front keeps the structure and its systems visible.
    var spaceSystem = new THREE.Group();
    cutaway.add(spaceSystem);
    addBox(spaceSystem, [2.75, 0.13, 1.95], [0, -0.04, 0], architectureMaterial, true);

    var floorLevels = [0.12, 0.92, 1.72, 2.52];
    floorLevels.forEach(function (level, index) {
        addBox(spaceSystem, [2.12, 0.12, 1.48], [0, level, 0], architectureMaterial, true);
        if (index < floorLevels.length - 1) {
            addBox(spaceSystem, [2.08, 0.11, 0.11], [0, level + 0.11, 0.68], architectureMaterial, true);
            addBox(spaceSystem, [2.08, 0.11, 0.11], [0, level + 0.11, -0.68], architectureMaterial, true);
            addBox(spaceSystem, [0.11, 0.11, 1.36], [-0.99, level + 0.11, 0], architectureMaterial, true);
            addBox(spaceSystem, [0.11, 0.11, 1.36], [0.99, level + 0.11, 0], architectureMaterial, true);
        }
    });

    [-0.99, 0.99].forEach(function (x) {
        [-0.68, 0.68].forEach(function (z) {
            addBox(spaceSystem, [0.15, 2.73, 0.15], [x, 1.38, z], architectureMaterial, true);
        });
    });
    // Rear service core and a few facade bays give the cutaway a readable sense of depth.
    addBox(spaceSystem, [0.43, 2.66, 0.34], [-0.55, 1.39, -0.48], architectureMaterial, true);
    addBox(spaceSystem, [0.92, 0.5, 0.055], [0.48, 0.51, -0.704], glazingMaterial);
    addBox(spaceSystem, [0.92, 0.5, 0.055], [0.48, 1.31, -0.704], wallMaterial);
    addBox(spaceSystem, [0.92, 0.5, 0.055], [0.48, 2.11, -0.704], glazingMaterial);
    addBox(spaceSystem, [0.44, 0.5, 0.055], [-0.7, 0.51, -0.704], wallMaterial);
    addBox(spaceSystem, [0.44, 0.5, 0.055], [-0.7, 1.31, -0.704], glazingMaterial);

    // Scaffold bays, diagonal braces and exposed starter bars mark the active construction.
    var scaffoldSystem = new THREE.Group();
    spaceSystem.add(scaffoldSystem);
    [-1.2, -0.43].forEach(function (x) {
        addPipe(scaffoldSystem, [x, 0.08, 0.82], [x, 2.98, 0.82], 0.027, steelMaterial, true);
        addPipe(scaffoldSystem, [x, 0.08, 0.98], [x, 2.98, 0.98], 0.027, steelMaterial, true);
    });
    [0.36, 1.16, 1.96, 2.76].forEach(function (y) {
        addPipe(scaffoldSystem, [-1.2, y, 0.82], [-0.43, y, 0.82], 0.022, steelMaterial);
        addPipe(scaffoldSystem, [-1.2, y, 0.98], [-0.43, y, 0.98], 0.022, steelMaterial);
        addPipe(scaffoldSystem, [-1.2, y, 0.82], [-1.2, y, 0.98], 0.022, steelMaterial);
        addPipe(scaffoldSystem, [-0.43, y, 0.82], [-0.43, y, 0.98], 0.022, steelMaterial);
    });
    [
        [[-1.2, 0.36, 0.82], [-0.43, 1.16, 0.82]],
        [[-0.43, 0.36, 0.82], [-1.2, 1.16, 0.82]],
        [[-1.2, 1.16, 0.82], [-0.43, 1.96, 0.82]],
        [[-0.43, 1.16, 0.82], [-1.2, 1.96, 0.82]]
    ].forEach(function (brace) {
        addPipe(scaffoldSystem, brace[0], brace[1], 0.018, steelMaterial);
    });
    [-0.68, -0.15, 0.39, 0.73].forEach(function (x) {
        addPipe(spaceSystem, [x, 2.57, 0.38], [x, 3.05, 0.38], 0.019, rebarMaterial, true);
        addJoint(spaceSystem, [x, 2.58, 0.38], 0.03, rebarMaterial);
    });

    // A distinct riser and branches expose the water route on every occupied floor.
    var waterSystem = new THREE.Group();
    cutaway.add(waterSystem);
    addPipe(waterSystem, [-0.76, 0.18, 0.48], [-0.76, 2.42, 0.48], 0.034, waterMaterial, true);
    [0.42, 1.22, 2.02].forEach(function (y) {
        addPipe(waterSystem, [-0.76, y, 0.48], [0.16, y, 0.48], 0.029, waterMaterial);
        addPipe(waterSystem, [0.16, y, 0.48], [0.16, y - 0.19, 0.62], 0.024, waterMaterial);
        addJoint(waterSystem, [-0.76, y, 0.48], 0.046, waterMaterial);
        addJoint(waterSystem, [0.16, y, 0.48], 0.04, waterMaterial);
    });
    addPipe(waterSystem, [-0.76, 0.2, 0.48], [-0.76, 0.2, 0.68], 0.026, waterMaterial);

    // Electrical conduit uses its own riser, junction boxes and floor branches.
    var electricalSystem = new THREE.Group();
    cutaway.add(electricalSystem);
    addPipe(electricalSystem, [0.79, 0.18, 0.39], [0.79, 2.5, 0.39], 0.025, electricalMaterial, true);
    [0.46, 1.26, 2.06].forEach(function (y) {
        addPipe(electricalSystem, [0.79, y, 0.39], [0.05, y, 0.39], 0.021, electricalMaterial);
        addBox(electricalSystem, [0.2, 0.18, 0.1], [0.67, y - 0.2, 0.48], electricalMaterial);
        addJoint(electricalSystem, [0.05, y, 0.39], 0.034, electricalMaterial);
    });

    // Structured cabling: vertical riser, floor trays, three cable routes and a small rack.
    var cableSystem = new THREE.Group();
    cutaway.add(cableSystem);
    addBox(cableSystem, [0.13, 2.45, 0.16], [0.31, 1.4, 0.28], trayMaterial);
    [0.12, 0.92, 1.72].forEach(function (floor, floorIndex) {
        var trayY = floor + 0.56;
        addBox(cableSystem, [1.52, 0.035, 0.16], [-0.36, trayY, 0.2], trayMaterial);
        addBox(cableSystem, [1.52, 0.08, 0.022], [-0.36, trayY + 0.047, 0.12], trayMaterial);
        addBox(cableSystem, [1.52, 0.08, 0.022], [-0.36, trayY + 0.047, 0.28], trayMaterial);
        [-0.92, 0.2].forEach(function (x) {
            addBox(cableSystem, [0.035, 0.13, 0.035], [x, trayY - 0.08, 0.2], steelMaterial);
        });

        cableMaterials.forEach(function (material, cableIndex) {
            var offset = (cableIndex - 1) * 0.035;
            addPipe(cableSystem, [0.31 + offset, trayY + 0.07, 0.17 + offset], [-0.86, trayY + 0.07, 0.17 + offset], 0.012, material);
            addPipe(cableSystem, [-0.86, trayY + 0.07, 0.17 + offset], [-0.86, floor + 0.3, 0.55], 0.012, material);
        });

        addBox(cableSystem, [0.2, 0.13, 0.055], [-0.86, floor + 0.3, 0.58], rackMaterial);
        addBox(cableSystem, [0.12, 0.022, 0.015], [-0.86, floor + 0.3, 0.616], portMaterial);
        if (floorIndex === 0) {
            cableMaterials.forEach(function (material, cableIndex) {
                var offset = cableIndex * 0.025;
                addPipe(cableSystem, [0.31 + offset, trayY + 0.07, 0.2 + offset], [0.71, trayY + 0.07, 0.48], 0.012, material);
                addPipe(cableSystem, [0.71, trayY + 0.07, 0.48], [0.71, 0.58 - offset * 2, 0.55], 0.012, material);
            });
        }
    });

    [-0.12, 0.12].forEach(function (xOffset) {
        addBox(cableSystem, [0.025, 0.58, 0.035], [0.71 + xOffset, 0.44, 0.57], steelMaterial);
    });
    [0.71].forEach(function (x) {
        addBox(cableSystem, [0.25, 0.025, 0.035], [x, 0.15, 0.57], steelMaterial);
        addBox(cableSystem, [0.25, 0.025, 0.035], [x, 0.73, 0.57], steelMaterial);
    });
    [0.29, 0.45, 0.61].forEach(function (y) {
        addBox(cableSystem, [0.2, 0.075, 0.045], [0.71, y, 0.59], rackMaterial);
        for (var port = 0; port < 8; port += 1) {
            addBox(cableSystem, [0.012, 0.022, 0.012], [0.635 + port * 0.021, y, 0.618], portMaterial);
        }
    });
    var bounds = new THREE.Box3().setFromObject(cutaway);
    var center = bounds.getCenter(new THREE.Vector3());
    var size = bounds.getSize(new THREE.Vector3());
    cutaway.position.sub(center);
    var modelPositionY = cutaway.position.y;
    var modelScale = 2.7 / Math.max(size.x, size.y, size.z);
    cutaway.scale.setScalar(modelScale);
    scene.add(cutaway);

    var serviceControls = hero.querySelector('[data-service-controls]');
    var serviceButtons = serviceControls ? serviceControls.querySelectorAll('[data-service-select]') : [];
    var selectedService = 'all';
    var focus = { x: 0, y: 0 };
    var focusTarget = { x: 0, y: 0 };
    var focusAngles = {
        obra: { x: -0.04, y: 0.02 },
        cableado: { x: -0.1, y: -0.38 },
        agua: { x: 0.08, y: 0.34 },
        energia: { x: -0.12, y: -0.17 },
        all: { x: 0, y: 0 }
    };
    var materialStates = [
        {
            service: 'obra', material: architectureMaterial,
            active: new THREE.Color(0x9ba397), dim: new THREE.Color(0x545d55),
            activeGlow: new THREE.Color(0x303b31), dimGlow: new THREE.Color(0x111610),
            glow: 0.18, dimGlowIntensity: 0.01
        },
        {
            service: 'obra', material: wallMaterial,
            active: new THREE.Color(0x83958a), dim: new THREE.Color(0x4e5951),
            activeGlow: new THREE.Color(0x25392c), dimGlow: new THREE.Color(0x101610),
            glow: 0.13, dimGlowIntensity: 0.01, activeOpacity: 0.26, dimOpacity: 0.08
        },
        {
            service: 'obra', material: glazingMaterial,
            active: new THREE.Color(0x78a18e), dim: new THREE.Color(0x465a50),
            activeGlow: new THREE.Color(0x1b3930), dimGlow: new THREE.Color(0x0e1712),
            glow: 0.1, dimGlowIntensity: 0.01, activeOpacity: 0.48, dimOpacity: 0.2
        },
        {
            service: 'obra', material: steelMaterial,
            active: new THREE.Color(0x99aa9e), dim: new THREE.Color(0x4b5750),
            activeGlow: new THREE.Color(0x263b2e), dimGlow: new THREE.Color(0x101610),
            glow: 0.13, dimGlowIntensity: 0.01
        },
        {
            service: 'obra', material: rebarMaterial,
            active: new THREE.Color(0xa99f87), dim: new THREE.Color(0x615b4d),
            activeGlow: new THREE.Color(0x3b3527), dimGlow: new THREE.Color(0x15140f),
            glow: 0.1, dimGlowIntensity: 0.01
        },
        {
            service: 'agua', material: waterMaterial,
            active: new THREE.Color(0x59b9af), dim: new THREE.Color(0x415e58),
            activeGlow: new THREE.Color(0x16776f), dimGlow: new THREE.Color(0x0d201d),
            glow: 0.38, dimGlowIntensity: 0.02
        },
        {
            service: 'energia', material: electricalMaterial,
            active: new THREE.Color(0xd4f542), dim: new THREE.Color(0x626c3c),
            activeGlow: new THREE.Color(0x708d18), dimGlow: new THREE.Color(0x171c0c),
            glow: 0.35, dimGlowIntensity: 0.02
        },
        {
            service: 'cableado', material: trayMaterial,
            active: new THREE.Color(0x65776c), dim: new THREE.Color(0x37423b),
            activeGlow: new THREE.Color(0x263b30), dimGlow: new THREE.Color(0x101610),
            glow: 0.16, dimGlowIntensity: 0.01
        },
        {
            service: 'cableado', material: rackMaterial,
            active: new THREE.Color(0x33473c), dim: new THREE.Color(0x19231d),
            activeGlow: new THREE.Color(0x1d3429), dimGlow: new THREE.Color(0x0c120e),
            glow: 0.14, dimGlowIntensity: 0.01
        }
    ];
    cableMaterials.forEach(function (material, index) {
        materialStates.push({
            service: 'cableado',
            material: material,
            active: new THREE.Color([0x39c5c5, 0x5a89e8, 0xd4f542][index]),
            dim: new THREE.Color([0x315b5a, 0x3e4e72, 0x626c3c][index]),
            activeGlow: new THREE.Color([0x0d4444, 0x162c61, 0x455318][index]),
            dimGlow: new THREE.Color(0x101610),
            glow: 0.28,
            dimGlowIntensity: 0.02
        });
    });
    function selectService(service) {
        selectedService = selectedService === service ? 'all' : service;
        var angle = focusAngles[selectedService];
        focusTarget.x = angle.x;
        focusTarget.y = angle.y;

        serviceButtons.forEach(function (button) {
            button.setAttribute('aria-pressed', String(button.dataset.serviceSelect === selectedService));
        });
    }

    serviceButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            selectService(button.dataset.serviceSelect);
        });
    });

    var pointerTarget = { x: 0, y: 0 };
    var pointer = { x: 0, y: 0 };
    var dragTarget = { x: 0, y: 0 };
    var drag = { x: 0, y: 0 };
    var lastPointer = { x: 0, y: 0 };
    var pointerId = null;
    var scrollProgress = 0;
    var hostBounds = { left: 0, top: 0, width: 1, height: 1 };
    var heroHeight = Math.max(hero.offsetHeight, 1);
    var isVisible = false;
    var isDragging = false;
    var frameId = 0;
    var previousTime = 0;
    var idleRotation = 0;
    var environmentScheduled = false;
    var environmentAttempted = false;
    var environmentTarget = null;
    var minFrameDuration = 1000 / 60;

    function resize() {
        var rect = host.getBoundingClientRect();
        var width = Math.round(rect.width);
        var height = Math.round(rect.height);
        if (!width || !height) return;

        hostBounds = { left: rect.left, top: rect.top, width: width, height: height };
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        heroHeight = Math.max(hero.getBoundingClientRect().height, 1);
        var fit = Math.min(1, Math.max(0.78, Math.min(width, height) / 500));
        cutaway.scale.setScalar(modelScale * fit);
    }

    function updateScroll() {
        scrollProgress = Math.max(0, Math.min(1, window.scrollY / heroHeight));
    }

    function motionIsReduced() {
        return motionPreference.matches || dataPreference.matches;
    }

    function queueEnvironmentLoad() {
        if (environmentScheduled || environmentAttempted) return;
        environmentScheduled = true;

        function loadWhenIdle() {
            environmentScheduled = false;
            if (!isVisible || document.hidden || environmentAttempted) return;
            environmentAttempted = true;

            var loader = new RGBELoader().setDataType(THREE.HalfFloatType);
            var url = new URL('../assets/hdri/studio_small_09_1k.hdr', import.meta.url).href;
            loader.load(url, function (hdrTexture) {
                if (!host.isConnected || !isVisible || document.hidden) {
                    hdrTexture.dispose();
                    environmentAttempted = false;
                    return;
                }

                var pmrem;
                try {
                    pmrem = new THREE.PMREMGenerator(renderer);
                    pmrem.compileEquirectangularShader();
                    environmentTarget = pmrem.fromEquirectangular(hdrTexture);
                    scene.environment = environmentTarget.texture;
                    scene.environmentIntensity = 0.55;
                } catch (_error) {
                    if (environmentTarget) environmentTarget.dispose();
                    environmentTarget = null;
                    scene.environment = null;
                } finally {
                    hdrTexture.dispose();
                    if (pmrem) pmrem.dispose();
                }
            }, undefined, function () {
                // The three studio lights remain the fallback if the local HDR asset cannot load.
            });
        }

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(loadWhenIdle, { timeout: 2200 });
        } else {
            window.setTimeout(loadWhenIdle, 250);
        }
    }

    function onPointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return;
        isDragging = true;
        pointerId = event.pointerId;
        lastPointer.x = event.clientX;
        lastPointer.y = event.clientY;
        host.classList.add('is-dragging');
        if (host.setPointerCapture && pointerId !== undefined) host.setPointerCapture(pointerId);
        event.preventDefault();
    }

    function onPointerMove(event) {
        if (isDragging && (pointerId === null || event.pointerId === pointerId)) {
            dragTarget.y += (event.clientX - lastPointer.x) * 0.008;
            dragTarget.x = Math.max(-0.72, Math.min(0.72, dragTarget.x + (event.clientY - lastPointer.y) * 0.008));
            lastPointer.x = event.clientX;
            lastPointer.y = event.clientY;
            return;
        }

        var localX = (event.clientX - hostBounds.left) / hostBounds.width;
        var localY = (event.clientY - hostBounds.top) / hostBounds.height;
        pointerTarget.x = Math.max(-1, Math.min(1, (localX - 0.5) * 2));
        pointerTarget.y = Math.max(-1, Math.min(1, (localY - 0.5) * 2));
    }

    function onPointerUp(event) {
        if (!isDragging || (pointerId !== null && event.pointerId !== pointerId)) return;
        isDragging = false;
        host.classList.remove('is-dragging');
        if (host.releasePointerCapture && pointerId !== null && host.hasPointerCapture(pointerId)) {
            host.releasePointerCapture(pointerId);
        }
        pointerId = null;
    }

    function stop() {
        if (!frameId) return;
        window.cancelAnimationFrame(frameId);
        frameId = 0;
        previousTime = 0;
    }

    function render(time) {
        frameId = 0;
        if (!isVisible || document.hidden || motionIsReduced()) return;
        if (previousTime && time - previousTime < minFrameDuration) {
            frameId = window.requestAnimationFrame(render);
            return;
        }

        var delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
        previousTime = time;
        var easing = 1 - Math.exp(-5 * delta);
        pointer.x += (pointerTarget.x - pointer.x) * easing;
        pointer.y += (pointerTarget.y - pointer.y) * easing;
        drag.x += (dragTarget.x - drag.x) * easing;
        drag.y += (dragTarget.y - drag.y) * easing;
        focus.x += (focusTarget.x - focus.x) * easing;
        focus.y += (focusTarget.y - focus.y) * easing;
        idleRotation += delta * 0.055;

        materialStates.forEach(function (state) {
            var active = selectedService === 'all' || state.service === selectedService;
            var targetColor = active ? state.active : state.dim;
            var targetEmissive = active ? state.activeGlow : state.dimGlow;
            state.material.color.lerp(targetColor, easing);
            state.material.emissive.lerp(targetEmissive, easing);
            state.material.emissiveIntensity += ((active ? state.glow : state.dimGlowIntensity) - state.material.emissiveIntensity) * easing;
            if (state.activeOpacity !== undefined) {
                state.material.opacity += ((active ? state.activeOpacity : state.dimOpacity) - state.material.opacity) * easing;
            }
        });

        cutaway.rotation.x = focus.x + drag.x + pointer.y * 0.045 + scrollProgress * 0.07;
        cutaway.rotation.y = idleRotation + focus.y + drag.y + pointer.x * 0.07 + scrollProgress * 0.16;
        cutaway.rotation.z = pointer.x * 0.01;
        cutaway.position.y = modelPositionY - scrollProgress * 0.035 + Math.sin(time * 0.0007) * 0.018;

        renderer.render(scene, camera);
        host.classList.add('is-ready');
        queueEnvironmentLoad();
        frameId = window.requestAnimationFrame(render);
    }

    function start() {
        if (!isVisible || document.hidden || motionIsReduced() || frameId) return;
        frameId = window.requestAnimationFrame(render);
    }

    function onMotionPreferenceChange() {
        if (motionIsReduced()) {
            stop();
            host.classList.remove('is-ready');
            if (serviceControls) serviceControls.hidden = true;
        } else {
            if (serviceControls) serviceControls.hidden = false;
            start();
        }
    }

    var visibilityObserver = new IntersectionObserver(function (entries) {
        isVisible = entries.some(function (entry) { return entry.isIntersecting; });
        if (isVisible) start();
        else stop();
    }, { threshold: 0.01 });

    var resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    if (resizeObserver) resizeObserver.observe(host);
    else window.addEventListener('resize', resize, { passive: true });

    visibilityObserver.observe(hero);
    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove, { passive: true });
    host.addEventListener('pointerup', onPointerUp);
    host.addEventListener('pointercancel', onPointerUp);
    host.addEventListener('lostpointercapture', onPointerUp);
    host.addEventListener('pointerleave', function () {
        if (!isDragging) {
            pointerTarget.x = 0;
            pointerTarget.y = 0;
        }
    });
    window.addEventListener('scroll', updateScroll, { passive: true });
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop();
        else start();
    });
    if (motionPreference.addEventListener) {
        motionPreference.addEventListener('change', onMotionPreferenceChange);
        dataPreference.addEventListener('change', onMotionPreferenceChange);
    } else if (motionPreference.addListener) {
        motionPreference.addListener(onMotionPreferenceChange);
        dataPreference.addListener(onMotionPreferenceChange);
    }

    canvas.addEventListener('webglcontextlost', function (event) {
        event.preventDefault();
        stop();
        host.classList.remove('is-ready');
        if (serviceControls) serviceControls.hidden = true;
        if (environmentTarget) {
            environmentTarget.dispose();
            environmentTarget = null;
            scene.environment = null;
        }
    });

    if (serviceControls && !motionIsReduced()) serviceControls.hidden = false;
    resize();
    updateScroll();
}



