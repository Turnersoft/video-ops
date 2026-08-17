/**
 * Episode metadata from animation.md — sole authoring source for pre-edit scripts.
 */
import type { ParsedScript } from './video-ops/parseVideoOpsMarkdown.ts';
import { normalizeScriptStatus } from './video-ops/videoOpsStatus.ts';

function parseYamlFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
        return { frontmatter: {}, body: raw };
    }
    const frontmatter: Record<string, string> = {};
    for (const line of match[1].split('\n')) {
        const keyMatch = line.match(/^([A-Za-z][\w-]*):\s*(.+)$/);
        if (keyMatch) {
            frontmatter[keyMatch[1]] = keyMatch[2].trim().replace(/^["']|["']$/g, '');
        }
    }
    return { frontmatter, body: match[2] };
}

function firstSceneTitle(body: string): string | undefined {
    const match = body.match(/^#\s*Scene(?:\s+\d+)?:\s*(.+)$/m);
    return match?.[1]?.trim();
}

function firstBeatSay(body: string): string | undefined {
    const beatMatch = body.match(/^##\s+Beat[\s\S]*?\n\n([\s\S]*?)(?=\n###\s|\n##\s|$)/m);
    if (!beatMatch) {
        return undefined;
    }
    return beatMatch[1]
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('<!--'))
        .join('\n')
        .trim();
}

/** Build social-posts input from animation.md frontmatter + scene/beats. */
export function parsedScriptFromAnimationMarkdown(
    scriptId: string,
    animationMarkdownRaw: string,
): ParsedScript {
    const { frontmatter, body } = parseYamlFrontmatter(animationMarkdownRaw);
    const sceneTitle = firstSceneTitle(body);
    const beatSay = firstBeatSay(body);
    const title =
        frontmatter.title?.trim() ||
        sceneTitle ||
        scriptId;

    return {
        filename: `${scriptId}/animation.md`,
        title,
        playlist: frontmatter.playlist,
        series: frontmatter.series,
        status: frontmatter.status,
        productionStatus: normalizeScriptStatus(frontmatter.status),
        audience: frontmatter.audience,
        promotionalDescription: frontmatter.promotionalDescription,
        promotionalDescriptionChina: frontmatter.promotionalDescriptionChina,
        socialTitleEnglish: frontmatter.socialTitleEnglish,
        socialTitleChina: frontmatter.socialTitleChina,
        coreIdea: frontmatter.coreIdea,
        scriptSummary: frontmatter.scriptSummary,
        slideComments: {},
        slides: beatSay
            ? [
                  {
                      index: 1,
                      title: sceneTitle ?? title,
                      say: beatSay,
                      screen: '',
                      visualNotes: '',
                  },
              ]
            : [],
        blocks: [],
        sections: [],
        raw: animationMarkdownRaw,
    };
}
