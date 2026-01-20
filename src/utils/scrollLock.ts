let lockCount = 0;

let prevHtmlOverflow: string | null = null;
let prevBodyOverflow: string | null = null;

/**
 * Disables page scrolling (hides scrollbars) until the returned function is called.
 * Safe to call multiple times; scroll will be restored when all locks are released.
 */
export function lockPageScroll(): () => void {
  lockCount += 1;

  if (lockCount === 1) {
    const html = document.documentElement;
    const body = document.body;

    prevHtmlOverflow = html.style.overflow;
    prevBodyOverflow = body.style.overflow;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
  }

  return () => {
    lockCount = Math.max(0, lockCount - 1);

    if (lockCount === 0) {
      const html = document.documentElement;
      const body = document.body;

      html.style.overflow = prevHtmlOverflow ?? '';
      body.style.overflow = prevBodyOverflow ?? '';

      prevHtmlOverflow = null;
      prevBodyOverflow = null;
    }
  };
}
