/**
 * Backdrop — parallax and scroll drift for the nebula plate.
 *
 * Everything is written to CSS custom properties, so the compositor does the
 * work and this file stays tiny. No canvas, no WebGL, no per-frame layout
 * reads. If it never runs, the plate simply sits still; its fade-in is a CSS
 * animation, not a scripted one.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function mountBackdrop(host: HTMLElement): () => void {
  let px = 0;
  let py = 0;
  let tx = 0;
  let ty = 0;
  let frame = 0;
  let alive = true;

  function queue() {
    if (!frame && alive) frame = requestAnimationFrame(step);
  }

  function step() {
    frame = 0;
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;

    const progress = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.4);
    host.style.setProperty('--px', `${px.toFixed(2)}px`);
    host.style.setProperty('--py', `${py.toFixed(2)}px`);
    host.style.setProperty('--drift', `${(progress * -14).toFixed(2)}vh`);
    host.style.setProperty('--dim', (1 - Math.min(progress, 1) * 0.76).toFixed(3));

    if (Math.abs(tx - px) > 0.05 || Math.abs(ty - py) > 0.05) queue();
  }

  const onScroll = () => queue();
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    tx = (0.5 - e.clientX / window.innerWidth) * 30;
    ty = (0.5 - e.clientY / window.innerHeight) * 20;
    queue();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  const usePointer = !reduceMotion.matches && window.matchMedia('(pointer: fine)').matches;
  if (usePointer) window.addEventListener('pointermove', onPointer, { passive: true });

  step();

  return () => {
    alive = false;
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    window.removeEventListener('pointermove', onPointer);
  };
}
