// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/useKnowledgePanelHighlights.ts
import { useEffect } from 'react';
import type { RefObject } from 'react';

import type { HighlightOverlay } from '../../lib/panels/highlightTransition';
import { COMPARE_HIGHLIGHT_ATTR } from '../../lib/tracks/compareHintLayout';

const HIGHLIGHT_ATTR = 'data-video-knowledge-highlight';
const HIGHLIGHT_WRAP_CLASS = 'video-knowledge-highlight-wrap';

function normalizeNeedle(needle: string): string {
    return needle.replace(/`/g, '').trim();
}

function applyHighlightStyles(el: HTMLElement, opacity: number): void {
    el.style.background = `rgba(182, 109, 72, ${0.24 * opacity})`;
    el.style.boxShadow = `0 0 0 2px rgba(182, 109, 72, ${0.38 * opacity})`;
    el.style.borderRadius = '4px';
}

function clearHighlightStyles(el: HTMLElement): void {
    el.removeAttribute(HIGHLIGHT_ATTR);
    el.style.background = '';
    el.style.boxShadow = '';
    el.style.borderRadius = '';
}

function unwrapHighlightSpans(root: HTMLElement): void {
    root.querySelectorAll(`.${HIGHLIGHT_WRAP_CLASS}`).forEach((node) => {
        const span = node as HTMLElement;
        const parent = span.parentNode;
        if (!parent) {
            return;
        }
        parent.replaceChild(document.createTextNode(span.textContent ?? ''), span);
        parent.normalize();
    });
}

function highlightNeedleInTextNodes(el: HTMLElement, needle: string, opacity: number): void {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
        if (current.textContent?.includes(needle)) {
            textNodes.push(current as Text);
        }
        current = walker.nextNode();
    }

    for (const textNode of textNodes) {
        const text = textNode.textContent ?? '';
        const parent = textNode.parentNode;
        if (!parent || !text.includes(needle)) {
            continue;
        }

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let index = text.indexOf(needle, lastIndex);

        while (index !== -1) {
            if (index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)));
            }
            const span = document.createElement('span');
            span.className = HIGHLIGHT_WRAP_CLASS;
            span.setAttribute(HIGHLIGHT_ATTR, 'true');
            span.setAttribute(COMPARE_HIGHLIGHT_ATTR, 'true');
            span.textContent = text.slice(index, index + needle.length);
            applyHighlightStyles(span, opacity);
            fragment.appendChild(span);
            lastIndex = index + needle.length;
            index = text.indexOf(needle, lastIndex);
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        parent.replaceChild(fragment, textNode);
    }
}

/** Pulse matching words / sentences in prose and math — never section titles. */
export function useKnowledgePanelHighlights(
    rootRef: RefObject<HTMLElement | null>,
    overlays: HighlightOverlay[],
): void {
    useEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return;
        }

        unwrapHighlightSpans(root);
        root.querySelectorAll(`[${HIGHLIGHT_ATTR}="true"]`).forEach((node) => {
            clearHighlightStyles(node as HTMLElement);
        });

        const active = overlays.filter((overlay) => overlay.opacity > 0 && normalizeNeedle(overlay.text));
        const inlineCandidates = root.querySelectorAll('.para, .sec--kind-law');
        const blockCandidates = root.querySelectorAll('.knowledge-math-root, mjx-container');

        for (const overlay of active) {
            const needle = normalizeNeedle(overlay.text);
            if (!needle) {
                continue;
            }

            inlineCandidates.forEach((node) => {
                const el = node as HTMLElement;
                if (el.closest('.secTitle')) {
                    return;
                }
                const text = el.textContent ?? '';
                if (!text.includes(needle)) {
                    return;
                }
                if (needle.length >= 24 || text.trim() === needle) {
                    el.setAttribute(HIGHLIGHT_ATTR, 'true');
                    applyHighlightStyles(el, overlay.opacity);
                    return;
                }
                highlightNeedleInTextNodes(el, needle, overlay.opacity);
            });

            blockCandidates.forEach((node) => {
                const el = node as HTMLElement;
                const text = el.textContent ?? '';
                if (!text.includes(needle)) {
                    return;
                }
                el.setAttribute(HIGHLIGHT_ATTR, 'true');
                applyHighlightStyles(el, overlay.opacity);
            });
        }

        return () => {
            unwrapHighlightSpans(root);
            root.querySelectorAll(`[${HIGHLIGHT_ATTR}="true"]`).forEach((node) => {
                clearHighlightStyles(node as HTMLElement);
            });
        };
    }, [overlays, rootRef]);
}
