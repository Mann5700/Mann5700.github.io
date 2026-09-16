/**
 * Cosmos — a procedural deep-space environment. No library, no image assets.
 *
 * Two passes. The nebula is domain-warped noise, which is far too expensive to
 * run per frame, so it is baked once into an off-screen texture and only
 * redrawn when the viewport changes. The per-frame pass just samples that
 * texture with parallax and draws the live star layers over it.
 *
 * Everything here is progressive enhancement. The element it mounts into
 * already carries a CSS fallback, so if WebGL is unavailable, the context is
 * lost, or this file never loads, the page still looks finished.
 */

type Quality = 'high' | 'low';

/** The baked texture covers more than the viewport so parallax and scroll
 *  drift have somewhere to move without exposing an edge. The margin is
 *  0.5 - 0.5/OVERSCAN = 0.167 in UV, comfortably above the 0.142 that maximum
 *  drift plus maximum parallax can consume. */
const OVERSCAN = 1.5;

/** Nebula texels per CSS pixel. Gas is soft, so it upscales invisibly. */
const NEBULA_SCALE = 0.6;

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

/**
 * NEBULA PASS
 * Domain-warped noise shaped into a supernova remnant. This is expensive, so it
 * is rendered once into an off-screen texture and only redrawn on resize.
 * The texture is larger than the viewport, which gives parallax and scroll
 * drift somewhere to move without ever exposing an edge.
 */
const NEBULA_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  u_res;
uniform vec2  u_center;
uniform float u_scale;
uniform float u_overscan;
uniform float u_gain;

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
  for (int i = 0; i < 5; i++) {
    v += a * valueNoise(p);
    p = p * 2.07 + 13.1;
    a *= 0.5;
  }
  return v;
}

// Ridged noise. Inverting and squaring the peaks is what produces thin
// strands rather than blobs — the filaments a remnant is actually made of.
float ridged(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    float n = 1.0 - abs(valueNoise(p) * 2.0 - 1.0);
    v += a * n * n;
    p = p * 2.13 + 7.7;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res - 0.5;
  vec2 p = vec2(uv.x * (u_res.x / u_res.y), uv.y) * u_overscan;
  vec2 g = (p - u_center) / u_scale;

  // Two levels of domain warping. One level gives clouds; two gives the
  // tangled, sheared structure that reads as gas under pressure.
  vec2 q = vec2(fbm(g * 1.8), fbm(g * 1.8 + vec2(5.2, 1.3)));
  vec2 r = vec2(
    fbm(g * 1.8 + 3.4 * q + vec2(1.7, 9.2)),
    fbm(g * 1.8 + 3.4 * q + vec2(8.3, 2.8))
  );
  float f = fbm(g * 1.8 + 3.6 * r);

  // Crab-inspired: violet outskirts, teal oxygen shell, warm sulphur
  // filaments, hot gold only where the gas is densest.
  vec3 teal   = vec3(0.10, 0.62, 0.78);
  vec3 ember  = vec3(0.98, 0.34, 0.14);
  vec3 violet = vec3(0.40, 0.16, 0.66);
  vec3 gold   = vec3(1.00, 0.84, 0.54);

  float density = f * f * f + 0.62 * f * f + 0.5 * f;

  // Dust lanes subtract before the colour ramp, so the ramp sees real voids.
  float dust = fbm(g * 1.15 + 21.7);
  density *= 1.0 - 0.62 * smoothstep(0.40, 0.86, dust);

  // Colour follows density rather than the noise vectors, which is what keeps
  // the palette legible instead of muddy.
  float t = clamp(density * 1.2, 0.0, 1.0);
  vec3 col = mix(violet * 0.6, teal, smoothstep(0.06, 0.40, t));
  col = mix(col, ember, smoothstep(0.46, 0.82, t));
  col = mix(col, gold, smoothstep(0.84, 1.0, t));

  // The warp vectors then break the ramp up so it never reads as a gradient.
  col = mix(col, teal * 1.2, clamp((q.y - 0.55) * 1.2, 0.0, 0.42));
  col = mix(col, ember, clamp((r.x - 0.62) * 1.4, 0.0, 0.34));

  col *= density * 1.9;

  float fil = ridged(g * 3.1 + r * 1.6);
  fil = clamp(fil - 0.52, 0.0, 1.0) * 2.0;
  fil = fil * fil;
  col += fil * mix(vec3(0.30, 0.90, 0.98), gold, clamp(t * 1.5, 0.0, 1.0)) * 0.55 * density;

  float d = length(g * vec2(1.0, 1.18));
  col += exp(-d * 2.6) * vec3(0.34, 0.56, 0.95) * 0.22;
  col += exp(-d * 6.5) * vec3(0.95, 0.78, 0.58) * 0.18;

  // Confines the cloud so it reads as an object in deep space, not a wash.
  col *= smoothstep(1.45, 0.15, d);

  gl_FragColor = vec4(max(col, 0.0) * u_gain, 1.0);
}
`;

/**
 * SKY PASS
 * Cheap enough to run every frame: samples the baked nebula with parallax,
 * draws the live star layers over it, and grades the result.
 */
const SKY_FRAG = `
precision mediump float;

uniform vec2      u_res;
uniform sampler2D u_neb;
uniform vec2      u_pointer;
uniform float     u_time;
uniform float     u_scroll;
uniform float     u_quality;
uniform float     u_reveal;
uniform float     u_overscan;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
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
  vec2 frag = gl_FragCoord.xy / u_res;
  vec2 uv = frag - 0.5;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 par = u_pointer;

  // The remnant drifts up and out of frame as the page scrolls.
  float drift = clamp(u_scroll, 0.0, 1.6) * 0.07;
  vec2 tuv = (uv + par * 0.5 + vec2(0.0, -drift)) / u_overscan + 0.5;
  vec3 col = texture2D(u_neb, tuv).rgb;

  // A slow luminance swell, so the cloud never reads as a frozen image.
  col *= 0.95 + 0.05 * sin(u_time * 0.11 + tuv.x * 4.0 + tuv.y * 3.0);

  // -- stars -----------------------------------------------------------------
  vec2 sp = p + vec2(0.0, drift * 0.35);
  float s = 0.0;
  s += starLayer(sp + par * 0.30, 8.0, 0.050, 1.15);
  s += starLayer(sp + par * 0.85, 18.0, 0.032, 1.85) * 0.62;
  if (u_quality > 0.5) {
    s += starLayer(sp + par * 1.70, 38.0, 0.022, 2.60) * 0.34;
  }
  col += s * vec3(0.84, 0.89, 1.0);

  // -- grade -----------------------------------------------------------------
  col *= 1.0 - 0.5 * smoothstep(0.35, 1.3, length(p * vec2(0.85, 1.0)));
  col *= mix(1.0, 0.38, clamp(u_scroll, 0.0, 1.0));
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

function link(gl: WebGLRenderingContext, fragSrc: string) {
  const program = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!program || !vs || !fs) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  // Pinned so a single vertex attribute setup serves both programs.
  gl.bindAttribLocation(program, 0, 'a_pos');
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
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

  const nebulaProgram = link(gl, NEBULA_FRAG);
  const skyProgram = link(gl, SKY_FRAG);
  if (!nebulaProgram || !skyProgram) return noop;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const nu = {
    res: gl.getUniformLocation(nebulaProgram, 'u_res'),
    center: gl.getUniformLocation(nebulaProgram, 'u_center'),
    scale: gl.getUniformLocation(nebulaProgram, 'u_scale'),
    overscan: gl.getUniformLocation(nebulaProgram, 'u_overscan'),
    gain: gl.getUniformLocation(nebulaProgram, 'u_gain'),
  };

  const u = {
    res: gl.getUniformLocation(skyProgram, 'u_res'),
    neb: gl.getUniformLocation(skyProgram, 'u_neb'),
    pointer: gl.getUniformLocation(skyProgram, 'u_pointer'),
    time: gl.getUniformLocation(skyProgram, 'u_time'),
    scroll: gl.getUniformLocation(skyProgram, 'u_scroll'),
    quality: gl.getUniformLocation(skyProgram, 'u_quality'),
    reveal: gl.getUniformLocation(skyProgram, 'u_reveal'),
    overscan: gl.getUniformLocation(skyProgram, 'u_overscan'),
  };

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();

  host.appendChild(canvas);
  host.dataset.cosmos = 'live';

  // Sub-pages get the environment without the subject: the cloud starts drifted
  // out of frame, which also engages the sky pass's scroll dimming.
  const ambient = host.dataset.ambient === 'true';
  const scrollFloor = ambient ? 1 : 0;

  const maxDpr = quality === 'low' ? 1 : 1.5;
  let width = 0;
  let height = 0;
  let failed = false;

  function bakeNebula(landscape: boolean) {
    const nw = Math.max(16, Math.round(host.clientWidth * NEBULA_SCALE * OVERSCAN));
    const nh = Math.max(16, Math.round(host.clientHeight * NEBULA_SCALE * OVERSCAN));

    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, nw, nh, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.framebufferTexture2D(
      gl!.FRAMEBUFFER,
      gl!.COLOR_ATTACHMENT0,
      gl!.TEXTURE_2D,
      texture,
      0,
    );

    if (gl!.checkFramebufferStatus(gl!.FRAMEBUFFER) !== gl!.FRAMEBUFFER_COMPLETE) {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      failed = true;
      return;
    }

    gl!.viewport(0, 0, nw, nh);
    gl!.useProgram(nebulaProgram!);
    gl!.uniform2f(nu.res, nw, nh);
    // Landscape puts the remnant right of centre so the headline owns the left.
    // Portrait lifts it into the band the hero reserves above the name.
    gl!.uniform2f(nu.center, landscape ? 0.36 : 0.0, landscape ? -0.02 : 0.3);
    gl!.uniform1f(nu.scale, landscape ? 0.36 : 0.26);
    gl!.uniform1f(nu.overscan, OVERSCAN);
    gl!.uniform1f(nu.gain, landscape ? 1 : 0.82);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.max(1, Math.round(host.clientWidth * dpr));
    const h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (w === width && h === height) return;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;

    bakeNebula(host.clientWidth / host.clientHeight > 1.05);

    gl!.viewport(0, 0, w, h);
    gl!.useProgram(skyProgram!);
    gl!.uniform2f(u.res, w, h);
    gl!.uniform1f(u.overscan, OVERSCAN);
    gl!.uniform1i(u.neb, 0);
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

  function bail() {
    stop();
    canvas.remove();
    delete host.dataset.cosmos;
  }

  function render(now: number) {
    if (!running) return;
    frame = requestAnimationFrame(render);
    resize();
    if (failed) return bail();

    pointerX += (targetX - pointerX) * 0.045;
    pointerY += (targetY - pointerY) * 0.045;
    scroll = scrollFloor + Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.6);
    reveal = Math.min(1, reveal + 0.02);

    gl!.useProgram(skyProgram!);
    gl!.uniform2f(u.pointer, pointerX, pointerY);
    gl!.uniform1f(u.time, (now - start) / 1000);
    gl!.uniform1f(u.scroll, scroll);
    gl!.uniform1f(u.quality, quality === 'high' ? 1 : 0);
    gl!.uniform1f(u.reveal, reveal);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function renderStatic() {
    resize();
    if (failed) return bail();
    gl!.useProgram(skyProgram!);
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
