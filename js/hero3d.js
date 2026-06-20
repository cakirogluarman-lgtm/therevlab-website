/* ═══════════════════════════════════════════════════════════════
   REVLAB — dual-model liquid hologram hero (Three.js r128)
   Reuses the Coastmotive hologram engine: a glassy, rippling
   "liquid protection" film wraps each model, and a liquid seam
   crossfades between the YACHT (marine) and the CAR (automotive).
   The crossfade is driven by the Marine / Automotive toggle via
   window.RV_MODE_BLEND  (-1 = marine/yacht … +1 = automotive/car).
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (typeof window.RV_MODE_BLEND !== 'number') window.RV_MODE_BLEND = 1; // default: automotive

  function ready() { return window.THREE && THREE.GLTFLoader; }

  function makeHolo(side, base, doubleSided) {
    var uniforms = {
      uTime:  { value: 0 },
      uSplit: { value: side <= 0 ? 1000 : -1000 },
      uSide:  { value: side },
      uClipY: { value: -1000 },
      uBase:  { value: base || 0.30 },
      uPre:   { value: 0 }
    };
    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms, transparent: true, depthWrite: true, depthTest: true,
      side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      vertexShader: [
        'varying vec3 vN; varying vec3 vView; varying vec3 vWorld; varying vec3 vObj;',
        'void main(){',
        '  vec4 wp = modelMatrix * vec4(position,1.0);',
        '  vN = normalize(mat3(modelMatrix) * normal);',
        '  vView = normalize(cameraPosition - wp.xyz);',
        '  vWorld = wp.xyz;',
        '  vObj = position;',
        '  gl_Position = projectionMatrix * viewMatrix * wp;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime; uniform float uSplit; uniform float uSide; uniform float uClipY; uniform float uBase; uniform float uPre;',
        'varying vec3 vN; varying vec3 vView; varying vec3 vWorld; varying vec3 vObj;',
        'float liquidEdge(vec3 w, float t){',
        '  float ripple = sin(w.y * 3.2 + t * 1.6) * 0.22',
        '               + sin(w.z * 4.0 - t * 1.3) * 0.16',
        '               + sin((w.y + w.z) * 7.5 + t * 2.6) * 0.07',
        '               + sin(w.y * 13.0 - t * 3.4) * 0.03;',
        '  return ripple;',
        '}',
        'void main(){',
        '  if (vObj.y < uClipY) discard;',
        '  float vis = 1.0; float seamD = 1000.0; float dVis = 1000.0;',
        '  if (uSide != 0.0) {',
        '    float edge = uSplit + liquidEdge(vWorld, uTime);',
        '    float d = (vWorld.x - edge) * uSide + 0.45;',
        '    dVis = d;',
        '    vis = smoothstep(-0.10, 0.10, d);',
        '    if (vis < 0.02) discard;',
        '    if (uPre > 0.5 && d < 0.55) discard;',
        '    seamD = abs(vWorld.x - edge);',
        '    if (!gl_FrontFacing && seamD < 0.9) discard;',
        '  }',
        '  vec3 N = normalize(vN); vec3 V = normalize(vView);',
        '  if (!gl_FrontFacing) N = -N;',
        '  float ndv  = clamp(dot(N, V), 0.0, 1.0);',
        '  float fres = pow(1.0 - ndv, 1.7);',
        '  vec3 L  = normalize(vec3(0.4, 0.85, 0.55));',
        '  vec3 H  = normalize(L + V);',
        '  float spec  = pow(max(dot(N, H),  0.0), 55.0) * 2.2;',
        '  float lambert = clamp(dot(N, L), 0.0, 1.0) * 0.6 + 0.4;',
        '  vec3 bodyDark = vec3(0.05, 0.40, 0.66);',
        '  vec3 bodyLit  = vec3(0.48, 0.95, 1.0);',
        '  vec3 body = mix(bodyDark, bodyLit, lambert);',
        '  vec3 edge = vec3(0.88, 1.0, 1.0);',
        '  float pulse = 0.5 + 0.5 * sin(uTime * 1.4);',
        '  vec3 col  = mix(body, edge, fres * 0.85);',
        '  col += edge * pow(fres, 2.3) * (0.85 + 0.7 * pulse);',
        '  col += vec3(0.10, 0.32, 0.45) * (0.55 + 0.45 * pulse);',
        '  col += vec3(1.0) * spec;',
        '  if (uSide != 0.0) {',
        '    float shade = exp(-max(dVis, 0.0) * 2.2);',
        '    col *= 1.0 - 0.5 * shade;',
        '    float core = exp(-seamD * 16.0);',
        '    float halo = exp(-seamD * 4.0);',
        '    col = mix(col, vec3(0.62, 0.95, 1.0), clamp(core * 1.1, 0.0, 0.8));',
        '    col += vec3(0.18, 0.42, 0.55) * halo * (0.30 + 0.22 * pulse);',
        '  }',
        '  col *= 0.92 + 0.13 * pulse;',
        '  float alpha = clamp(mix(uBase, 1.0, fres) + spec * 0.7 + 0.12, 0.0, 1.0) * vis;',
        '  gl_FragColor = vec4(col, alpha);',
        '}'
      ].join('\n')
    });
    return { mat: mat, uniforms: uniforms };
  }

  function makeShell(holoUniforms) {
    return new THREE.ShaderMaterial({
      uniforms: holoUniforms, transparent: true, side: THREE.BackSide,
      polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
      vertexShader: [
        'varying vec3 vWorld; varying vec3 vObj;',
        'void main(){',
        '  vec4 wp = modelMatrix * vec4(position,1.0);',
        '  vWorld = wp.xyz; vObj = position;',
        '  gl_Position = projectionMatrix * viewMatrix * wp;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime; uniform float uSplit; uniform float uSide; uniform float uClipY;',
        'varying vec3 vWorld; varying vec3 vObj;',
        'float liquidEdge(vec3 w, float t){',
        '  return sin(w.y * 3.2 + t * 1.6) * 0.22',
        '       + sin(w.z * 4.0 - t * 1.3) * 0.16',
        '       + sin((w.y + w.z) * 7.5 + t * 2.6) * 0.07',
        '       + sin(w.y * 13.0 - t * 3.4) * 0.03;',
        '}',
        'void main(){',
        '  if (vObj.y < uClipY) discard;',
        '  float a = 1.0;',
        '  if (uSide != 0.0) {',
        '    float d = (vWorld.x - (uSplit + liquidEdge(vWorld, uTime))) * uSide + 0.45;',
        '    a = smoothstep(0.18, 1.35, d);',
        '    if (a < 0.02) discard;',
        '  }',
        '  gl_FragColor = vec4(0.016, 0.07, 0.12, a);',
        '}'
      ].join('\n')
    });
  }

  function makePrepass(holoUniforms) {
    return new THREE.ShaderMaterial({
      uniforms: holoUniforms, colorWrite: false, depthWrite: true, depthTest: true, side: THREE.FrontSide,
      vertexShader: [
        'varying vec3 vWorld; varying vec3 vObj;',
        'void main(){',
        '  vec4 wp = modelMatrix * vec4(position,1.0);',
        '  vWorld = wp.xyz; vObj = position;',
        '  gl_Position = projectionMatrix * viewMatrix * wp;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime; uniform float uSplit; uniform float uSide; uniform float uClipY;',
        'varying vec3 vWorld; varying vec3 vObj;',
        'float liquidEdge(vec3 w, float t){',
        '  return sin(w.y * 5.0 + t * 2.2) * 0.10',
        '       + sin(w.z * 4.0 - t * 1.7) * 0.08',
        '       + sin((w.y + w.z) * 9.0 + t * 3.1) * 0.035;',
        '}',
        'void main(){',
        '  if (vObj.y < uClipY) discard;',
        '  if (uSide != 0.0) {',
        '    float d = (vWorld.x - (uSplit + liquidEdge(vWorld, uTime))) * uSide;',
        '    if (smoothstep(-0.06, 0.06, d) < 0.02) discard;',
        '  }',
        '  gl_FragColor = vec4(0.0);',
        '}'
      ].join('\n')
    });
  }

  function makeLoader() {
    var loader = new THREE.GLTFLoader();
    try {
      if (THREE.DRACOLoader) {
        var d = new THREE.DRACOLoader();
        d.setDecoderPath('assets/vendor/draco/');
        loader.setDRACOLoader(d);
      }
    } catch (e) {}
    return loader;
  }

  function createViewer(opts) {
    var container = document.getElementById(opts.id);
    if (!container || !ready()) return;

    var isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    var W = container.clientWidth || 600, H = container.clientHeight || 460;
    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(isMobile ? 34 : 32, W / H, 0.1, 1000);
    var SETTLE = { pos: new THREE.Vector3(0, 1.4, isMobile ? 8.4 : 9.0), look: new THREE.Vector3(0, 0, 0) };
    camera.position.copy(SETTLE.pos);
    camera.lookAt(SETTLE.look);

    var pivot = new THREE.Group();
    scene.add(pivot);

    var holos = [];
    var modelRoots = [];
    var ready3d = false;
    var entrance = 0;
    var curYaw = 0, curPitch = 0;
    var spin = 0;
    var spinSpeed = 0.30;
    var SPREAD = 3.6;

    var blend = window.RV_MODE_BLEND, blendTarget = window.RV_MODE_BLEND;
    var isDual = opts.models.length > 1;

    opts.models.forEach(function (m, modelIdx) {
      makeLoader().load((isMobile && m.urlMobile) ? m.urlMobile : m.url, function (gltf) {
        var loaded = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        if (!loaded) return;

        var box = new THREE.Box3().setFromObject(loaded);
        var sz = box.getSize(new THREE.Vector3());
        var maxDim = Math.max(sz.x, sz.y, sz.z) || 1;
        var fit = (m.fit || 6.2) * (isMobile ? 0.82 : 1);
        loaded.scale.setScalar(fit / maxDim);
        box.setFromObject(loaded);
        loaded.position.sub(box.getCenter(new THREE.Vector3()));

        var holo = makeHolo(isDual ? m.side : 0, m.solid ? 0.58 : 0.30, !!m.solid);
        if (m.clipFrac) {
          var ob = new THREE.Box3();
          loaded.traverse(function (o) {
            if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); ob.union(o.geometry.boundingBox); }
          });
          holo.uniforms.uClipY.value = ob.min.y + (ob.max.y - ob.min.y) * m.clipFrac;
          holo.userData = { objBox: ob };
        }
        var shellMat = makeShell(holo.uniforms);
        var prepassMat = null;
        if (m.solid) {
          prepassMat = holo.mat.clone();
          var preUniforms = {};
          for (var k in holo.uniforms) preUniforms[k] = holo.uniforms[k];
          preUniforms.uPre = { value: 1 };
          prepassMat.uniforms = preUniforms;
          prepassMat.colorWrite = false;
          prepassMat.transparent = false;
          prepassMat.depthWrite = true;
          prepassMat.depthFunc = THREE.LessEqualDepth;
          prepassMat.polygonOffset = true;
          prepassMat.polygonOffsetFactor = 1.0;
          prepassMat.polygonOffsetUnits = 2.0;
          holo.mat.depthWrite = true;
          holo.mat.depthFunc = THREE.LessDepth;
        }
        var meshes = [];
        loaded.traverse(function (o) { if (o.isMesh && o.geometry) meshes.push(o); });
        meshes.forEach(function (o) {
          o.material = holo.mat;
          o.renderOrder = 1 + modelIdx;
          var shell = new THREE.Mesh(o.geometry, shellMat);
          shell.renderOrder = -1;
          o.add(shell);
          if (prepassMat) {
            var pre = new THREE.Mesh(o.geometry, prepassMat);
            pre.renderOrder = 0;
            o.add(pre);
          }
        });
        if (typeof m.baseYaw === 'number') loaded.rotation.y = m.baseYaw;
        holo.modelRef = m;
        holos.push(holo);
        modelRoots[modelIdx] = loaded;
        pivot.add(loaded);

        ready3d = true;
        container.classList.add('is-loaded');
      }, undefined, function (err) {
        console.error('Revlab 3D load failed (' + m.url + '):', err);
        var l = container.querySelector('.r3d-loading');
        if (l) l.textContent = '3D unavailable';
      });
    });

    function resize() {
      W = container.clientWidth || 600; H = container.clientHeight || 460;
      renderer.setSize(W, H);
      camera.aspect = W / H; camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);

    var onScreen = true;
    if ('IntersectionObserver' in window) {
      var visIO = new IntersectionObserver(function (ents) { onScreen = ents[0] && ents[0].isIntersecting; }, { rootMargin: '120px 0px' });
      visIO.observe(container);
    }

    var t0 = performance.now();
    function animate(now) {
      requestAnimationFrame(animate);
      var dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
      if (!onScreen) return;

      var time = now / 1000;
      if (ready3d) {
        if (entrance < 1) {
          entrance = Math.min(1, entrance + dt * 0.45);
          var e = 1 - Math.pow(1 - entrance, 3);
          pivot.scale.setScalar(0.9 + 0.1 * e);
        }

        // gentle cursor lean (desktop) — keeps the hologram alive
        var px = (window.RVPointer && window.RVPointer.x) || 0;
        var py = (window.RVPointer && window.RVPointer.y) || 0;
        curYaw += (px * 0.30 - curYaw) * 0.05;
        curPitch += (py * 0.14 - curPitch) * 0.05;

        // crossfade is driven by the Marine / Automotive toggle
        blendTarget = (typeof window.RV_MODE_BLEND === 'number') ? window.RV_MODE_BLEND : 1;

        if (isDual) {
          blend += (blendTarget - blend) * 0.05;     // slow = liquid
          var splitX = -blend * SPREAD;
          for (var i = 0; i < holos.length; i++) holos[i].uniforms.uSplit.value = splitX;
        }

        spin += dt * spinSpeed;
        pivot.rotation.y = spin + curYaw;
        pivot.rotation.x = curPitch;
        pivot.position.y = Math.sin(now / 2200) * 0.04;
      }
      for (var j = 0; j < holos.length; j++) holos[j].uniforms.uTime.value = time;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);

    window.RV3D = window.RV3D || {};
    window.RV3D[opts.id] = {
      setBlend: function (v) { window.RV_MODE_BLEND = v; },
      speed: function (s) { spinSpeed = s; }
    };
  }

  if (!window.RVPointer) {
    window.RVPointer = { x: 0, y: 0 };
    var setP = function (cx, cy) {
      window.RVPointer.x = (cx / window.innerWidth) * 2 - 1;
      window.RVPointer.y = (cy / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', function (e) { setP(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('touchmove', function (e) { if (e.touches[0]) setP(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  }

  function bootOne(spec, tries) {
    tries = tries || 0;
    var c = document.getElementById(spec.id);
    var sized = c && c.clientHeight > 40 && c.clientWidth > 40;
    if (ready() && sized) { createViewer(spec); return; }
    if (tries < 100) { setTimeout(function () { bootOne(spec, tries + 1); }, 100); }
  }

  function bootAll() {
    bootOne({
      id: 'hero3d',
      models: [
        { url: 'assets/yacht.glb', urlMobile: 'assets/yacht-m.glb', side: -1, clipFrac: 0.14, fit: 6.2 },
        { url: 'assets/car.glb',   urlMobile: 'assets/car-m.glb',   side: +1, fit: 5.6, solid: true }
      ]
    }, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAll);
  } else { bootAll(); }
})();
