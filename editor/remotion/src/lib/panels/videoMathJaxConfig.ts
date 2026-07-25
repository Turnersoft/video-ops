// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/panels/videoMathJaxConfig.ts
/** MathJax 3 config for Remotion + video panels (AMS, color highlights). */
export const VIDEO_MATHJAX_SRC =
    'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js';

/** Config for the combined CDN build (`tex-mml-chtml.js`) — avoid re-loading bundled `[tex]` packages. */
export const VIDEO_MATHJAX_CONFIG = {
    tex: {
        tags: 'ams',
        packages: {
            '[+]': ['base', 'ams', 'color', 'colortbl', 'tagformat', 'unicode'],
        },
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$']],
        processEnvironments: true,
        processRefs: true,
    },
    tagformat: {
        number: (n: number) => n.toString(),
        tag: (tag: string) => `(${tag})`,
        id: (id: string) => `mjx-eqn:${id.replace(/\s/g, '_')}`,
        url: (id: string, base: string) => `${base}#${encodeURIComponent(id)}`,
    },
    chtml: {
        scale: 1,
        matchFontHeight: false,
    },
    options: {
        skipHtmlTags: ['noscript', 'style', 'textarea', 'pre', 'code'],
        ignoreHtmlClass: 'tex2jax_ignore',
        renderActions: {
            addMenu: [],
        },
    },
} as const;
