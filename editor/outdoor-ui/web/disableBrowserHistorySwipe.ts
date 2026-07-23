/**
 * Block macOS trackpad two-finger horizontal swipe → browser back/forward.
 * CSS overscroll-behavior alone is not reliable in Chrome/Safari; wheel guard fills the gap.
 */
function nodeAllowsHorizontalWheel(node: HTMLElement, deltaX: number): boolean {
  let current: HTMLElement | null = node;
  while (current && current !== document.documentElement) {
    const style = getComputedStyle(current);
    const overflowX = style.overflowX;
    const overflow = style.overflow;
    const canScrollX =
      overflowX === 'auto' ||
      overflowX === 'scroll' ||
      overflow === 'auto' ||
      overflow === 'scroll';
    if (canScrollX && current.scrollWidth > current.clientWidth + 1) {
      const atLeft = current.scrollLeft <= 0;
      const atRight =
        current.scrollLeft + current.clientWidth >= current.scrollWidth - 1;
      const scrollingLeft = deltaX < 0;
      const scrollingRight = deltaX > 0;
      if ((scrollingLeft && !atLeft) || (scrollingRight && !atRight)) {
        return true;
      }
    }
    current = current.parentElement;
  }
  return false;
}

export function disableBrowserHistorySwipe(): () => void {
  const onWheel = (event: WheelEvent) => {
    if (event.deltaX === 0) {
      return;
    }
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
      return;
    }
    const target = event.target;
    if (target instanceof HTMLElement && nodeAllowsHorizontalWheel(target, event.deltaX)) {
      return;
    }
    event.preventDefault();
  };

  document.addEventListener('wheel', onWheel, { passive: false });
  return () => {
    document.removeEventListener('wheel', onWheel);
  };
}
