/**
 * Progressive enhancement for the whole site. Every behaviour here is additive:
 * remove this file and the page still reads, navigates and submits nothing.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)');

/* ------------------------------------------------------------------ reveal */

function initReveal() {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!targets.length) return;

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        const delay = el.dataset.revealDelay;
        if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
        el.classList.add('is-revealed');
        io.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );

  targets.forEach((el) => io.observe(el));
}

/* --------------------------------------------------------------- navigation */

function initNav() {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('[data-nav-link]'));
  const toggle = nav.querySelector<HTMLButtonElement>('[data-nav-toggle]');
  const panel = nav.querySelector<HTMLElement>('[data-nav-panel]');
  const progress = document.querySelector<HTMLElement>('[data-scroll-progress]');

  const sections = links
    .map((link) => {
      const id = link.getAttribute('href')?.split('#')[1];
      return id ? document.getElementById(id) : null;
    })
    .filter((el): el is HTMLElement => Boolean(el));

  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    nav!.classList.toggle('is-condensed', y > 24);

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty('--progress', String(max > 0 ? Math.min(y / max, 1) : 0));
    }

    if (!sections.length) return;
    const line = y + window.innerHeight * 0.34;
    let active = sections[0]!;
    for (const section of sections) {
      if (section.offsetTop <= line) active = section;
    }
    // At the very bottom the last section wins regardless of its height.
    if (y + window.innerHeight >= document.documentElement.scrollHeight - 8) {
      active = sections[sections.length - 1]!;
    }
    for (const link of links) {
      const isActive = link.getAttribute('href')?.endsWith(`#${active.id}`) ?? false;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();

  if (!toggle || !panel) return;

  const setOpen = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    panel.toggleAttribute('data-open', open);
    document.body.dataset.menuOpen = String(open);
    if (open) panel.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true });
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  panel.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  window.matchMedia('(min-width: 60rem)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}

/* ------------------------------------------------------------------ cursor */

function initCursor() {
  if (!finePointer.matches || reduceMotion.matches) return;

  const root = document.createElement('div');
  root.className = 'cursor';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<span class="cursor__ring"></span><span class="cursor__dot"></span>';
  document.body.appendChild(root);

  const ring = root.querySelector<HTMLElement>('.cursor__ring')!;
  const dot = root.querySelector<HTMLElement>('.cursor__dot')!;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let rx = x;
  let ry = y;
  let magnet: HTMLElement | null = null;
  let visible = false;

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        visible = true;
        root.classList.add('is-visible');
      }
      const target = (e.target as HTMLElement).closest<HTMLElement>(
        'a, button, [data-magnetic], summary, input, textarea',
      );
      magnet = target?.hasAttribute('data-magnetic') ? target : null;
      root.classList.toggle('is-active', Boolean(target));
    },
    { passive: true },
  );

  document.addEventListener('pointerdown', () => root.classList.add('is-down'));
  document.addEventListener('pointerup', () => root.classList.remove('is-down'));
  document.addEventListener('pointerleave', () => {
    visible = false;
    root.classList.remove('is-visible');
  });

  function loop() {
    requestAnimationFrame(loop);
    let tx = x;
    let ty = y;
    if (magnet) {
      const r = magnet.getBoundingClientRect();
      tx = r.left + r.width / 2;
      ty = r.top + r.height / 2;
    }
    rx += (tx - rx) * 0.18;
    ry += (ty - ry) * 0.18;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;

    if (magnet) {
      const dx = (x - rx) * 0.22;
      const dy = (y - ry) * 0.22;
      magnet.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
  }
  requestAnimationFrame(loop);

  document.addEventListener(
    'pointerover',
    (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-magnetic]');
      if (!el && magnet) {
        magnet.style.transform = '';
      }
    },
    { passive: true },
  );

  document.addEventListener(
    'pointerout',
    (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-magnetic]');
      if (el) el.style.transform = '';
    },
    { passive: true },
  );
}

/* ----------------------------------------------------------- constellation */

/** Links each skill chip to its star in the group's constellation figure. */
function initConstellation() {
  for (const group of document.querySelectorAll<HTMLElement>('[data-constellation]')) {
    const stars = Array.from(group.querySelectorAll<HTMLElement>('[data-star]'));
    const chips = Array.from(group.querySelectorAll<HTMLElement>('[data-star-index]'));
    if (!stars.length || !chips.length) continue;

    const set = (index: number, on: boolean) => {
      const star = stars[index];
      if (star) star.classList.toggle('is-lit', on);
    };

    for (const chip of chips) {
      const index = Number(chip.dataset.starIndex);
      const on = () => set(index, true);
      const off = () => set(index, false);
      chip.addEventListener('pointerenter', on);
      chip.addEventListener('pointerleave', off);
      chip.addEventListener('focusin', on);
      chip.addEventListener('focusout', off);
    }
  }
}

/* -------------------------------------------------------------- copy email */

function initCopy() {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    button.addEventListener('click', async () => {
      const value = button.dataset.copy!;
      try {
        await navigator.clipboard.writeText(value);
        button.dataset.state = 'copied';
      } catch {
        button.dataset.state = 'failed';
      }
      window.setTimeout(() => delete button.dataset.state, 1800);
    });
  }
}

/* --------------------------------------------------------------- bootstrap */

function boot() {
  initReveal();
  // Tells the inline failsafe in Base.astro that reveals are being handled.
  document.documentElement.setAttribute('data-enhanced', '');
  initNav();
  initConstellation();
  initCopy();
  initCursor();
}

function start() {
  try {
    boot();
  } catch {
    document.documentElement.classList.remove('js');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
