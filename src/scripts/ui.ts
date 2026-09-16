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

/** Pulls `[data-magnetic]` controls a little toward the pointer on hover. */
function initMagnetic() {
  if (!finePointer.matches || reduceMotion.matches) return;

  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'));
  if (!targets.length) return;

  const STRENGTH = 0.28;
  const RANGE = 28;

  for (const el of targets) {
    let frame = 0;
    let dx = 0;
    let dy = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const settle = () => {
      dx += (tx - dx) * 0.2;
      dy += (ty - dy) * 0.2;
      if (Math.abs(tx - dx) > 0.1 || Math.abs(ty - dy) > 0.1) {
        el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
        frame = requestAnimationFrame(settle);
        return;
      }
      dx = tx;
      dy = ty;
      el.style.transform = tx === 0 && ty === 0 ? '' : `translate3d(${tx}px, ${ty}px, 0)`;
      frame = 0;
    };

    const queue = () => {
      if (!frame) frame = requestAnimationFrame(settle);
    };

    // Measured on enter and offset by any transform still decaying, so the
    // element never chases a centre that its own movement is shifting.
    const anchor = () => {
      const r = el.getBoundingClientRect();
      cx = r.left + r.width / 2 - dx;
      cy = r.top + r.height / 2 - dy;
    };

    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      anchor();
    });

    el.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        if (!cx && !cy) anchor();
        tx = Math.max(-RANGE, Math.min(RANGE, (e.clientX - cx) * STRENGTH));
        ty = Math.max(-RANGE, Math.min(RANGE, (e.clientY - cy) * STRENGTH));
        queue();
      },
      { passive: true },
    );

    const release = () => {
      tx = 0;
      ty = 0;
      cx = 0;
      cy = 0;
      queue();
    };

    el.addEventListener('pointerleave', release);
    el.addEventListener('blur', release);
  }
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

/* ----------------------------------------------------------- resume viewer */

/**
 * Upgrades every "Resume" link into the in-page viewer. Each trigger keeps a
 * real href to the PDF, so without this — or without <dialog> support — the
 * links still open the file in a new tab.
 */
function initResumeViewer() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-resume-viewer]');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const triggers = document.querySelectorAll<HTMLAnchorElement>('[data-resume-open]');
  if (!triggers.length) return;

  let opener: HTMLElement | null = null;

  const open = (event: MouseEvent) => {
    // Leave modified clicks alone so "open in new tab" still works.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    opener = event.currentTarget as HTMLElement;
    document.body.dataset.menuOpen = 'false';
    document.querySelector('[data-nav-panel]')?.removeAttribute('data-open');
    document.querySelector('[data-nav-toggle]')?.setAttribute('aria-expanded', 'false');
    dialog.showModal();
  };

  for (const trigger of triggers) trigger.addEventListener('click', open);

  dialog.querySelector('[data-resume-close]')?.addEventListener('click', () => dialog.close());

  // The dialog element fills the viewport, so a click that lands on it rather
  // than on the panel came from the backdrop.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  // Not all engines dispatch `cancel` reliably, so Escape is handled directly
  // rather than left to the platform.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dialog.open) {
      event.preventDefault();
      dialog.close();
    }
  });

  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
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
  initResumeViewer();
  initMagnetic();
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
