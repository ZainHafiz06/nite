import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function sphere() {
    /* ----------------------------- Container & Renderer ----------------------------- */
    const container = document.querySelector('.hr-visual .sphere');

    // Transparent canvas so page background shows through
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setClearColor(0x000000, 0); // fully transparent
    container.appendChild(renderer.domElement);

    // Scene stays transparent too
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    /* ----------------------------- Debounced, guarded sizing ----------------------------- */
    function applySize(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    }

    let pending = null;
    function queueResize(){
    const rect = container.getBoundingClientRect();
    pending = { w: rect.width, h: rect.height };
    if (!queueResize.scheduled) {
        queueResize.scheduled = true;
        requestAnimationFrame(() => {
        queueResize.scheduled = false;
        if (pending) {
            applySize(pending.w, pending.h);
            pending = null;
        }
        });
    }
    }
    queueResize.scheduled = false;

    // Initial size
    queueResize();

    // Observe container + window for changes
    const ro = new ResizeObserver(queueResize);
    ro.observe(container);
    window.addEventListener('resize', queueResize);

    /* ----------------------------- Sphere ----------------------------- */
    const COUNT  = 3500;
    const RADIUS = 1.80;
    const pos   = new Float32Array(COUNT*3);
    const phase = new Float32Array(COUNT);

    const PHI=(1+Math.sqrt(5))/2, ga=2*Math.PI*(1-1/PHI);
    for (let i=0;i<COUNT;i++){
    const t=i+0.5, y=1-(t/COUNT)*2, r=Math.sqrt(1-y*y), th=ga*t;
    const x=Math.cos(th)*r, z=Math.sin(th)*r;
    pos[i*3+0]=x*RADIUS; pos[i*3+1]=y*RADIUS; pos[i*3+2]=z*RADIUS;
    phase[i] = Math.random()*Math.PI*2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos,3));
    geo.setAttribute("aPhase",   new THREE.BufferAttribute(phase,1));

    const mat = new THREE.ShaderMaterial({
    transparent:true,
    depthWrite:false,
    blending:THREE.AdditiveBlending,
    uniforms:{
        uTime: { value: 0 },
        uSize: { value: 0.7 },
        uRate: { value: 1.0 },

        // surface waves (tangential flow)
        uWAmp:   { value: 0.08 },
        uWFreq:  { value: 2.2 },
        uWSpeed: { value: 0.6 },
        uWDir1:  { value: new THREE.Vector3(0.9, 0.2, 0.4).normalize() },
        uWDir2:  { value: new THREE.Vector3(-0.3, 1.0, 0.1).normalize() },

        // smooth hover force (continuous)
        uHoverOn:   { value: 0.0 },                          // 0/1
        uHoverCtr:  { value: new THREE.Vector3(0,0,1) },     // unit direction on sphere
        uHoverAmp:  { value: 0.22 },                         // strength
        uHoverSigma:{ value: 0.32 },                         // angular spread (radians)
        uHoverBias: { value: 0.9 }                           // extra smoothing (0..1)
    },
    vertexShader:/*glsl*/`
        precision mediump float;
        uniform float uTime, uSize, uRate;
        uniform float uWAmp, uWFreq, uWSpeed;
        uniform vec3  uWDir1, uWDir2;

        uniform float uHoverOn, uHoverAmp, uHoverSigma, uHoverBias;
        uniform vec3  uHoverCtr;

        attribute float aPhase;
        varying float vBlink;
        varying float vDepth;

        vec3 tangentNudgeAxis(vec3 dir, vec3 axis, float amt){
        vec3 t = normalize(cross(axis, dir));
        return normalize(dir + t * amt);
        }

        void main(){
        vec3 dir = normalize(position);

        // subtle surface waves (purely tangential)
        float w1 = sin(dot(dir, uWDir1) * uWFreq + uTime * uWSpeed *  2.0);
        float w2 = sin(dot(dir, uWDir2) * uWFreq - uTime * uWSpeed *  1.6);
        float wAmt = (w1 + w2) * 0.5 * uWAmp;
        dir = tangentNudgeAxis(dir, uWDir1, wAmt);
        dir = tangentNudgeAxis(dir, uWDir2, wAmt * 0.8);

        // smooth hover force (continuous)
        if (uHoverOn > 0.5) {
            vec3 ctr = normalize(uHoverCtr);
            float cosang = clamp(dot(dir, ctr), -1.0, 1.0);
            float ang = acos(cosang);
            // gaussian angular falloff + bias for smoother core
            float falloff = exp(- (ang*ang) / (2.0 * uHoverSigma * uHoverSigma));
            falloff = mix(falloff, falloff*falloff, uHoverBias);

            // tangent direction away from center
            vec3 tangentAway = dir - ctr * cosang;
            float lenTA = length(tangentAway);
            if (lenTA > 1e-6) {
            tangentAway /= lenTA;
            float amt = uHoverAmp * falloff;
            dir = normalize(dir + tangentAway * amt);
            }
        }

        vec3 displaced = dir * ${RADIUS.toFixed(3)};
        vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mv;

        float s = uSize * (150.0 / -mv.z);
        gl_PointSize = clamp(s, 0.6, 2.2);

        float wave = 0.5 + 0.5 * sin(uTime * uRate + aPhase);
        float pop  = pow(wave, 12.0);
        vBlink = mix(0.55, 1.0, wave) + pop * 0.5;

        vDepth = -mv.z;
        }
    `,
    fragmentShader:/*glsl*/`
        precision mediump float;
        varying float vBlink;
        varying float vDepth;
        void main(){
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float d = dot(uv,uv);
        if(d > 1.0) discard;
        float depthAlpha = smoothstep(5.0, 0.5, vDepth);
        float edge = smoothstep(1.0, 0.7, d);
        float alpha = edge * vBlink * depthAlpha * 0.95;
        gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
    `
    });

    const dots = new THREE.Points(geo, mat);
    scene.add(dots);

    /* ----------------------------- Mist Halo ----------------------------- */
    const MIST_COUNT = 1200;
    const MIST_INNER = RADIUS * 1.05;
    const MIST_OUTER = RADIUS * 1.65;
    const mPos  = new Float32Array(MIST_COUNT*3);
    const mSize = new Float32Array(MIST_COUNT);
    const mPhase= new Float32Array(MIST_COUNT);

    for (let i=0;i<MIST_COUNT;i++){
    const u = Math.random(), v = Math.random();
    const theta = 2*Math.PI*u;
    const phi   = Math.acos(2*v - 1);
    const dir = new THREE.Vector3(
        Math.sin(phi)*Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi)*Math.sin(theta)
    );
    const r = THREE.MathUtils.lerp(MIST_INNER, MIST_OUTER, Math.random());
    const p = dir.multiplyScalar(r);
    mPos[i*3+0]=p.x; mPos[i*3+1]=p.y; mPos[i*3+2]=p.z;

    mSize[i] = 1.0 + Math.random()*1.5;
    mPhase[i]= Math.random()*Math.PI*2;
    }
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute("position", new THREE.BufferAttribute(mPos,3));
    mistGeo.setAttribute("aSize",    new THREE.BufferAttribute(mSize,1));
    mistGeo.setAttribute("aPhase",   new THREE.BufferAttribute(mPhase,1));

    const mistMat = new THREE.ShaderMaterial({
    transparent:true,
    depthWrite:false,
    depthTest:true,
    blending:THREE.AdditiveBlending,
    uniforms:{
        uTime:    { value: 0 },
        uBaseSize:{ value: 0.5 },
        uOpacity: { value: 0.05 },
        uInner:   { value: MIST_INNER },
        uOuter:   { value: MIST_OUTER }
    },
    vertexShader:/*glsl*/`
        precision mediump float;
        uniform float uTime, uBaseSize;
        attribute float aSize, aPhase;
        varying float vDepth;
        varying float vRadial;

        void main(){
        float breathe = 1.0 + 0.03 * sin(uTime*0.5 + aPhase);
        float ang = 0.06 * sin(uTime*0.25 + aPhase*1.7);
        mat3 Ry = mat3(
            cos(ang), 0.0, sin(ang),
            0.0,      1.0, 0.0,
            -sin(ang),0.0, cos(ang)
        );
        vec3 pos = Ry * (position * breathe);
        vRadial = length(pos);

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;

        float s = (aSize * uBaseSize) * (220.0 / -mv.z);
        gl_PointSize = clamp(s, 0.6, 5.0);
        vDepth = -mv.z;
        }
    `,
    fragmentShader:/*glsl*/`
        precision mediump float;
        uniform float uOpacity, uInner, uOuter;
        varying float vDepth;
        varying float vRadial;
        void main(){
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float d = dot(uv,uv);
        if (d > 1.0) discard;

        float core = smoothstep(1.0, 0.0, d);
        float edge = smoothstep(1.0, 0.6, d);

        float depthAlpha = smoothstep(6.5, 0.8, vDepth);
        float shell = smoothstep(uInner, uInner*1.1, vRadial)
                    * smoothstep(uOuter, uOuter*0.9, vRadial);

        float alpha = uOpacity * core * edge * depthAlpha * shell;
        gl_FragColor = vec4(1.0,1.0,1.0, alpha);
        }
    `
    });
    const mist = new THREE.Points(mistGeo, mistMat);
    scene.add(mist);

    /* ----------------------------- Satellite (small, single color) ----------------------------- */
    const SAT_COLOR = 0x808080;
    const ORBIT_RADIUS = RADIUS * 1.38;
    const ORBIT_SPEED  = 0.0028;
    const SAT_AXIAL_SPEED = 0.0006;
    const ORBIT_INCL   = 0.32;
    const SAT_SCALE    = 0.35;

    const satMat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uTime:{value:0}, uSize:{value:0.03}, uRate:{value:0.8}, uColor:{value:new THREE.Color(SAT_COLOR)} },
    vertexShader:/*glsl*/`
        precision mediump float;
        uniform float uTime, uSize, uRate;
        attribute float aPhase;
        varying float vDepth, vBlink;
        void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * mv;
        float s = uSize * (200.0 / -mv.z);
        gl_PointSize = clamp(s,0.7,3.1);
        float wave = 0.5 + 0.5 * sin(uTime * uRate + aPhase);
        vBlink = mix(0.75, 1.0, wave);
        vDepth = -mv.z;
        }
    `,
    fragmentShader:/*glsl*/`
        precision mediump float;
        uniform vec3 uColor;
        varying float vDepth, vBlink;
        void main(){
        vec2 uv=gl_PointCoord*2.0-1.0; float d=dot(uv,uv); if(d>1.0) discard;
        float edge=smoothstep(1.0,0.7,d);
        float depthAlpha=smoothstep(6.0,0.8,vDepth);
        gl_FragColor=vec4(uColor*vBlink, edge*depthAlpha*0.95);
        }
    `
    });

    function buildPoints(vectors){
    const arr=new Float32Array(vectors.length*3), ph=new Float32Array(vectors.length);
    for(let i=0;i<vectors.length;i++){ const v=vectors[i]; arr[i*3]=v.x; arr[i*3+1]=v.y; arr[i*3+2]=v.z; ph[i]=Math.random()*Math.PI*2; }
    const g=new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.BufferAttribute(arr,3));
    g.setAttribute("aPhase",new THREE.BufferAttribute(ph,1));
    return new THREE.Points(g, satMat);
    }
    function panelGrid(w,h,nx,ny,offset){
    const out=[]; for(let iy=0; iy<=ny; iy++){ const y=THREE.MathUtils.lerp(-h/2,h/2,iy/ny);
        for(let ix=0; ix<=nx; ix++){ const x=THREE.MathUtils.lerp(-w/2,w/2,ix/nx); out.push(new THREE.Vector3(x,y,0).add(offset)); } }
    return out;
    }
    function boxSurface(w,h,d,nx,ny,nz){
    const out=[];
    for(let iy=0; iy<=ny; iy++){ for(let ix=0; ix<=nx; ix++){
        const x=THREE.MathUtils.lerp(-w/2,w/2,ix/nx), y=THREE.MathUtils.lerp(-h/2,h/2,iy/ny);
        out.push(new THREE.Vector3(x,y,d/2), new THREE.Vector3(x,y,-d/2));
    }}
    for(let iz=0; iz<=nz; iz++){ for(let ix=0; ix<=nx; ix++){
        const x=THREE.MathUtils.lerp(-w/2,w/2,ix/nx), z=THREE.MathUtils.lerp(-d/2,d/2,iz/nz);
        out.push(new THREE.Vector3(x,h/2,z), new THREE.Vector3(x,-h/2,z));
    }}
    for(let iz=0; iz<=nz; iz++){ for(let iy=0; iy<=ny; iy++){
        const y=THREE.MathUtils.lerp(-h/2,h/2,iy/ny), z=THREE.MathUtils.lerp(-d/2,d/2,iz/nz);
        out.push(new THREE.Vector3(w/2,y,z), new THREE.Vector3(-w/2,y,z));
    }}
    return out;
    }
    function diskPoints(radius, stepsR, stepsTheta, offset){
    const out=[]; for(let r=0;r<=stepsR;r++){ const rr=(r/stepsR)*radius;
        for(let t=0;t<stepsTheta;t++){ const th=(t/stepsTheta)*Math.PI*2;
        out.push(new THREE.Vector3(Math.cos(th)*rr, 0, Math.sin(th)*rr).add(offset));
        }
    }
    return out;
    }

    // base dimensions, scaled down
    const BUS_W=0.16*SAT_SCALE, BUS_H=0.12*SAT_SCALE, BUS_D=0.18*SAT_SCALE;
    const PANEL_W=0.85*SAT_SCALE, PANEL_H=0.22*SAT_SCALE, PANEL_GAP=0.08*SAT_SCALE;
    const DISH_R=0.10*SAT_SCALE, DISH_R2=0.07*SAT_SCALE, DISH_OFFSET_Y=0.05*SAT_SCALE;

    // build satellite parts
    const bus = buildPoints( boxSurface(BUS_W, BUS_H, BUS_D, 10,6,8) );
    const leftPanel  = buildPoints( panelGrid(PANEL_W, PANEL_H, 28,7, new THREE.Vector3(-(BUS_W/2 + PANEL_GAP + PANEL_W/2), 0.01, 0)) );
    const rightPanel = buildPoints( panelGrid(PANEL_W, PANEL_H, 28,7, new THREE.Vector3( (BUS_W/2 + PANEL_GAP + PANEL_W/2), 0.01, 0)) );
    const dishMain   = buildPoints( diskPoints(DISH_R, 10, 48, new THREE.Vector3(0, BUS_H/2 + DISH_OFFSET_Y, 0.02)) );
    dishMain.rotation.x = -0.6;
    const dishA      = buildPoints( diskPoints(DISH_R2, 8, 36, new THREE.Vector3(-BUS_W*0.28, BUS_H*0.35, BUS_D*0.25)) );
    dishA.rotation.x = -0.3; dishA.rotation.y = 0.25;
    const dishB      = buildPoints( diskPoints(DISH_R2, 8, 36, new THREE.Vector3( BUS_W*0.30, BUS_H*0.30,-BUS_D*0.22)) );
    dishB.rotation.x = -0.2; dishB.rotation.y = -0.3;

    // group, orbit, and spin
    const satGroup = new THREE.Group();
    satGroup.add(bus, leftPanel, rightPanel, dishMain, dishA, dishB);
    satGroup.position.set(ORBIT_RADIUS, 0, 0);
    const orbitPivot = new THREE.Group();
    orbitPivot.rotation.x = ORBIT_INCL;
    orbitPivot.add(satGroup);
    scene.add(orbitPivot);

    /* ----------------------------- Pointer & Hover (container-relative) ----------------------------- */
    dots.rotation.x = 0.35;
    mist.rotation.x = dots.rotation.x;

    let mX = 0, mY = 0;
    let yawOff = 0, pitchOff = 0;
    const MAX_YAW = 0.6, MAX_PITCH = 0.4, FOLLOW = 0.08;

    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    let pointerActive = false;
    let hoverDir = new THREE.Vector3(0,0,1);
    let hoverSmoothed = new THREE.Vector3(0,0,1);
    const HOVER_LERP = 0.25;

    function updatePointerFromEvent(clientX, clientY){
    const rect = container.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top)  / rect.height;
    mX = x * 2 - 1;
    mY = y * 2 - 1;
    pointerNDC.x = mX;
    pointerNDC.y = - (y * 2 - 1);
    }

    container.addEventListener('mousemove', e => {
    pointerActive = true;
    updatePointerFromEvent(e.clientX, e.clientY);
    });
    container.addEventListener('touchmove', e => {
    pointerActive = true;
    const t = e.touches[0];
    updatePointerFromEvent(t.clientX, t.clientY);
    }, {passive:true});

    /* invisible hit sphere that follows the dots (so transforms match) */
    const sphereMesh = new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS, 16, 12),
    new THREE.MeshBasicMaterial({visible:false})
    );
    dots.add(sphereMesh);

    /* ----------------------------- Animate ----------------------------- */
    const clock = new THREE.Clock();
    let spinY = 0, orbitAngle = 0, satSpin = 0;

    function tick(){
    const now = clock.getElapsedTime();
    mat.uniforms.uTime.value = now;
    mistMat.uniforms.uTime.value = now;
    satMat.uniforms.uTime.value = now;

    // base spin & camera-follow tilt
    spinY += 0.001;
    yawOff   += ( mX *  MAX_YAW   - yawOff  ) * FOLLOW;
    pitchOff += (-mY *  MAX_PITCH - pitchOff) * FOLLOW;

    dots.rotation.x = 0.35 + pitchOff;
    dots.rotation.y = spinY + yawOff;

    // keep mist aligned with sphere tilt/spin
    mist.rotation.x = dots.rotation.x;
    mist.rotation.y = dots.rotation.y;

    // orbit satellite around origin + slow axial spin
    orbitAngle += ORBIT_SPEED;
    orbitPivot.rotation.y = orbitAngle;   // true orbit
    satSpin += SAT_AXIAL_SPEED;
    satGroup.rotation.y = satSpin;        // slow self-rotation

    // update hover field only when pointer active and over sphere
    if (pointerActive) {
        raycaster.setFromCamera(pointerNDC, camera);
        const hit = raycaster.intersectObject(sphereMesh, false);
        if (hit.length) {
        hoverDir.copy(dots.worldToLocal(hit[0].point.clone())).normalize();
        hoverSmoothed.lerp(hoverDir, HOVER_LERP).normalize();
        mat.uniforms.uHoverCtr.value.copy(hoverSmoothed);
        mat.uniforms.uHoverOn.value = 1.0;
        } else {
        mat.uniforms.uHoverOn.value = 0.0;
        }
    } else {
        mat.uniforms.uHoverOn.value = 0.0;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
    }
    tick();

    /* ----------------------------- Keyboard (flicker speed) ----------------------------- */
    addEventListener("keydown", (e)=>{
    if (e.key === "[") mat.uniforms.uRate.value = Math.max(0, mat.uniforms.uRate.value - 0.1);
    if (e.key === "]") mat.uniforms.uRate.value += 0.1;
    });
}