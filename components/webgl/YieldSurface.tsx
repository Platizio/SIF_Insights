"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/* ============================================================
   YIELD SURFACE — contour isolines, ink on paper.

   A scalar height field from 4-octave fBm, rendered as contour lines
   only. Reads as a volatility surface / topographic engraving, which is
   semantically what a fund research house actually produces. The cursor
   injects a gaussian bump so the isolines bulge and re-settle.

   LIGHT-BACKGROUND RULES (why this works on warm paper where most
   showreel shaders fail — they assume dark and rely on ADDING luminance):
     · never additive; composed as mix(paper, ink, alpha)
     · total contrast budget kept small so it never fights body copy
     · line art, not gradient — no large dark regions, which read as holes
     · Bayer 8x8 dither, because 8-bit banding is brutally visible in the
       near-white range where human contrast sensitivity peaks
     · shadows warmed; neutral grey looks like a print error on cream
   ============================================================ */

const vertex = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
  precision highp float;

  uniform float uTime, uBands, uInkAlpha, uFlow;
  uniform vec2  uRes, uMouse;
  uniform vec3  uPaper, uInk;

  // --- Ashima simplex noise (3D) ---
  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec2 p, float t){
    float a = 0.5, s = 0.0;
    for(int i = 0; i < 4; i++){
      s += a * snoise(vec3(p, t));
      p *= 2.02; a *= 0.5;
    }
    return s;
  }

  // Bayer 8x8 ordered dither, built up from the 2x2 base.
  float Bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  #define Bayer4(a) (Bayer2(0.5 * (a)) * 0.25 + Bayer2(a))
  #define Bayer8(a) (Bayer4(0.5 * (a)) * 0.25 + Bayer2(a))

  void main(){
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

    float t = uTime * 0.045;                 // very slow drift
    vec2  q = p * 1.35 + vec2(uFlow * 0.10, 0.0);

    // cursor perturbation — a gaussian bump in the height field
    vec2  m = (uMouse - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 2.0;
    float bump = exp(-dot(p - m, p - m) * 7.0) * 0.55;

    float h = fbm(q, t) + bump;

    float f  = fract(h * uBands);
    float d  = abs(f - 0.5);
    float aa = fwidth(h * uBands) * 1.25;    // resolution-independent width
    float line = 1.0 - smoothstep(0.0, aa, d);

    // vignette so the field never competes with the headline
    float vig = smoothstep(1.15, 0.15, length(p * vec2(0.85, 1.0)));

    float alpha = line * uInkAlpha * vig;
    alpha += (Bayer8(gl_FragCoord.xy) - 0.5) / 255.0 * 3.0;

    gl_FragColor = vec4(mix(uPaper, uInk, clamp(alpha, 0.0, 1.0)), 1.0);
  }
`;

function Surface({ frozen }: { frozen: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();
  const target = useRef(new THREE.Vector2(0.5, 0.5));

  const uniforms = useMemo(
    () => ({
      uTime: { value: frozen ? 18.5 : 0 }, // hand-picked seed for a still frame
      uRes: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uPaper: { value: new THREE.Color("#f9f7f3") },
      uInk: { value: new THREE.Color("#2a241c") }, // warm near-black, never #000
      uBands: { value: 14 },
      uInkAlpha: { value: 0.3 },
      uFlow: { value: 0 },
    }),
    [frozen],
  );

  useEffect(() => {
    if (frozen) return;
    const onMove = (e: PointerEvent) => {
      target.current.set(
        e.clientX / window.innerWidth,
        1 - e.clientY / window.innerHeight,
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [frozen]);

  useFrame((_, dt) => {
    const m = mat.current;
    if (!m) return;
    m.uniforms.uRes.value.set(
      size.width * viewport.dpr,
      size.height * viewport.dpr,
    );
    if (frozen) return;
    m.uniforms.uTime.value += dt;
    // Frame-rate-independent lerp. A plain 0.08 runs twice as fast on a
    // 120Hz display, which is why so many follow effects feel inconsistent.
    m.uniforms.uMouse.value.lerp(target.current, 1 - Math.pow(0.001, dt));
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function YieldSurface({ frozen = false }: { frozen?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={frozen ? "demand" : "always"}
      gl={{
        antialias: false, // no geometry edges; the dither does the smoothing
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Surface frozen={frozen} />
    </Canvas>
  );
}
