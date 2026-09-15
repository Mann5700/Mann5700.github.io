/**
 * Cosmos — a procedural deep-space environment rendered in a single fragment
 * shader. No library, no textures, ~6KB of source.
 *
 * What it draws: three parallaxed star layers, faint nebula dust, an event
 * horizon that gravitationally lenses the background behind it, a photon ring
 * and a restrained accretion disk.
 *
 * Everything here is progressive enhancement. The element it mounts into
 * already carries a CSS gradient fallback, so if WebGL is unavailable, the
 * context is lost, or this file never loads, the page still looks finished.
 */

type Quality = 'high' | 'low';

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;

uniform vec2  u_res;
uniform vec2  u_center;
uniform vec2  u_pointer;
uniform float u_time;
uniform float u_scroll;
uniform float u_quality;
uniform float u_reveal;
uniform float u_rs;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * valueNoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

// One depth layer of stars. Cells are mostly empty so the sky stays sparse.
float starLayer(vec2 uv, float density, float size, float rate) {
  vec2 g = uv * density;
  vec2 id = floor(g);
  vec2 gv = fract(g) - 0.5;
  float n = hash21(id);
  if (n < 0.895) return 0.0;
  vec2 off = vec2(hash21(id + 11.3), hash21(id + 27.7)) - 0.5;
  float d = length(gv - off * 0.72);
  float core = smoothstep(size, 0.0, d);
  float halo = smoothstep(size * 4.5, 0.0, d) * 0.22;
  float tw = 0.7 + 0.3 * sin(u_time * rate + n * 63.0);
  return (core + halo) * tw * (0.45 + 0.55 * fract(n * 17.0));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec2 par = u_pointer;

  vec2 center = u_center;
  center.y += u_scroll * 1.15;

  vec2 p = uv - center;
  float r = max(length(p), 1e-4);

  float rs = u_rs * (1.0 - 0.28 * clamp(u_scroll, 0.0, 1.0));

  // Light passing near the mass is deflected, so the background appears pushed
  // outward. Sampling the starfield at the deflected coordinate is what draws
  // the Einstein ring for free.
  float bend = rs / r;
  vec2 sp = p * (1.0 + bend * bend * 1.5) + center;

  vec3 col = vec3(0.0);

  // -- nebula dust -----------------------------------------------------------
  float d1 = fbm(sp * 2.1 + vec2(u_time * 0.0045, u_time * 0.0022));
  float dust = smoothstep(0.54, 1.0, d1) * 0.075;
  if (u_quality > 0.5) {
    float d2 = fbm(sp * 4.6 - vec2(0.0, u_time * 0.0031));
    dust += smoothstep(0.64, 1.0, d2) * 0.035;
  }
  col += dust * vec3(0.30, 0.41, 0.62);
  col += dust * vec3(0.62, 0.34, 0.15) * smoothstep(1.0, 0.12, r) * 1.4;

  // -- stars -----------------------------------------------------------------
  float s = 0.0;
  s += starLayer(sp + par * 0.30, 8.0, 0.050, 1.15);
  s += starLayer(sp + par * 0.85, 18.0, 0.032, 1.85) * 0.62;
  if (u_quality > 0.5) {
    s += starLayer(sp + par * 1.70, 38.0, 0.022, 2.60) * 0.34;
  }
  col += s * vec3(0.84, 0.89, 1.0);

  // -- accretion disk --------------------------------------------------------
  float squash = 5.0;
  vec2 dq = vec2(p.x, p.y * squash);
  float rd = length(dq);
  float inner = rs * 1.75;
  float outer = rs * 5.6;
  float band = smoothstep(inner, inner * 1.22, rd) * (1.0 - smoothstep(outer * 0.5, outer, rd));
  float ang = atan(p.y * squash, p.x);
  float swirl = fbm(vec2(ang * 1.7, rd * 14.0 - u_time * 0.13));
  band *= 0.45 + 0.85 * swirl;
  // Relativistic beaming: the side rotating toward the viewer reads brighter.
  band *= 0.5 + 0.8 * smoothstep(0.4, -1.0, p.x / max(rd, 1e-4));
  vec3 diskCol = mix(vec3(1.0, 0.58, 0.24), vec3(1.0, 0.87, 0.70), smoothstep(inner, outer, rd));
  col += band * diskCol * 0.62;

  // -- photon ring + halo ----------------------------------------------------
  float ring = smoothstep(0.014, 0.0, abs(r - rs * 1.14));
  col += ring * vec3(1.0, 0.83, 0.62) * 0.75;
  col += exp(-r * 8.5) * vec3(0.95, 0.48, 0.20) * 0.14;

  // -- event horizon ---------------------------------------------------------
  col *= smoothstep(rs * 0.97, rs * 1.07, r);

  // -- grade -----------------------------------------------------------------
  col *= 1.0 - 0.5 * smoothstep(0.35, 1.3, length(uv * vec2(0.85, 1.0)));
  col *= mix(1.0, 0.42, clamp(u_scroll, 0.0, 1.0));
  col *= u_reveal;
  col += vec3(0.019, 0.023, 0.039);
  // Dither, otherwise the gradients band on 8-bit displays.
  col += (hash21(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.013;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function mountCosmos(host: HTMLElement): () => void {
  const noop = () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const quality: Quality = coarse || cores <= 4 ? 'low' : 'high';

  const canvas = document.createElement('canvas');
  canvas.className = 'cosmos__canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const gl = (canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'default',
    failIfMajorPerformanceCaveat: true,
  }) ?? null) as WebGLRenderingContext | null;

  if (!gl) return noop;

  const program = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!program || !vs || !fs) return noop;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return noop;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = {
    res: gl.getUniformLocation(program, 'u_res'),
    center: gl.getUniformLocation(program, 'u_center'),
    pointer: gl.getUniformLocation(program, 'u_pointer'),
    time: gl.getUniformLocation(program, 'u_time'),
    scroll: gl.getUniformLocation(program, 'u_scroll'),
    quality: gl.getUniformLocation(program, 'u_quality'),
    reveal: gl.getUniformLocation(program, 'u_reveal'),
    rs: gl.getUniformLocation(program, 'u_rs'),
  };

  host.appendChild(canvas);
  host.dataset.cosmos = 'live';

  // Sub-pages get the environment without the object: the hole starts lifted
  // out of frame, which also engages the shader's scroll dimming.
  const ambient = host.dataset.ambient === 'true';
  const scrollFloor = ambient ? 1 : 0;

  const maxDpr = quality === 'low' ? 1 : 1.5;
  let width = 0;
  let height = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.max(1, Math.round(host.clientWidth * dpr));
    const h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (w === width && h === height) return;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    gl!.viewport(0, 0, w, h);
    gl!.uniform2f(u.res, w, h);
    // Portrait viewports get a smaller hole near the top so the headline never
    // competes with the accretion disk; landscape offsets it to the right.
    const landscape = host.clientWidth / host.clientHeight > 1.05;
    gl!.uniform2f(u.center, landscape ? 0.33 : 0.0, landscape ? 0.0 : 0.33);
    gl!.uniform1f(u.rs, landscape ? 0.125 : 0.066);
  }

  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let scroll = 0;
  let reveal = 0;
  let running = true;
  let frame = 0;
  const start = performance.now();

  function onPointer(e: PointerEvent) {
    targetX = (e.clientX / window.innerWidth - 0.5) * 0.06;
    targetY = -(e.clientY / window.innerHeight - 0.5) * 0.06;
  }

  function render(now: number) {
    if (!running) return;
    frame = requestAnimationFrame(render);
    resize();

    pointerX += (targetX - pointerX) * 0.045;
    pointerY += (targetY - pointerY) * 0.045;
    scroll = scrollFloor + Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.6);
    reveal = Math.min(1, reveal + 0.02);

    gl!.uniform2f(u.pointer, pointerX, pointerY);
    gl!.uniform1f(u.time, (now - start) / 1000);
    gl!.uniform1f(u.scroll, scroll);
    gl!.uniform1f(u.quality, quality === 'high' ? 1 : 0);
    gl!.uniform1f(u.reveal, reveal);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function renderStatic() {
    resize();
    gl!.uniform2f(u.pointer, 0, 0);
    gl!.uniform1f(u.time, 12);
    gl!.uniform1f(
      u.scroll,
      scrollFloor + Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.6),
    );
    gl!.uniform1f(u.quality, quality === 'high' ? 1 : 0);
    gl!.uniform1f(u.reveal, 1);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }

  function onVisibility() {
    if (document.hidden) {
      stop();
    } else if (!reduced) {
      running = true;
      frame = requestAnimationFrame(render);
    }
  }

  const onContextLost = (e: Event) => {
    e.preventDefault();
    stop();
    canvas.remove();
    delete host.dataset.cosmos;
  };

  canvas.addEventListener('webglcontextlost', onContextLost);
  document.addEventListener('visibilitychange', onVisibility);

  if (reduced) {
    running = false;
    renderStatic();
    window.addEventListener('resize', renderStatic, { passive: true });
    window.addEventListener('scroll', renderStatic, { passive: true });
  } else {
    if (!coarse) window.addEventListener('pointermove', onPointer, { passive: true });
    frame = requestAnimationFrame(render);
  }

  return () => {
    stop();
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('resize', renderStatic);
    window.removeEventListener('scroll', renderStatic);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.remove();
  };
}
