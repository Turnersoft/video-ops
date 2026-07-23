// /Users/johndoe/Documents/company/basic_ui/src/pages/VideoOpsPage/videoOpsStatus.ts

export const SCRIPT_PRODUCTION_COLUMNS = [
    { id: 'idea', label: 'Idea', hint: 'Topic picked' },
    { id: 'script', label: 'Script', hint: 'Draft written' },
    { id: 'ready', label: 'Ready', hint: 'Ready to film' },
    { id: 'filmed', label: 'Filmed', hint: 'Recording done' },
    { id: 'published', label: 'Published', hint: 'Live online' },
] as const;

export type ScriptProductionStatus = (typeof SCRIPT_PRODUCTION_COLUMNS)[number]['id'];

const STATUS_ALIASES: Record<string, ScriptProductionStatus> = {
    idea: 'idea',
    draft: 'idea',
    topic: 'idea',
    script: 'script',
    writing: 'script',
    ready: 'ready',
    'ready to film': 'ready',
    film: 'ready',
    filmed: 'filmed',
    recorded: 'filmed',
    complete: 'filmed',
    completed: 'filmed',
    done: 'filmed',
    published: 'published',
    live: 'published',
};

export function formatScriptStatus(status: ScriptProductionStatus): string {
    const column = SCRIPT_PRODUCTION_COLUMNS.find((entry) => entry.id === status);
    return column?.label ?? 'Script';
}

export function normalizeScriptStatus(raw?: string): ScriptProductionStatus {
    if (!raw?.trim()) {
        return 'script';
    }
    const key = raw.trim().toLowerCase();
    return STATUS_ALIASES[key] ?? 'script';
}

export function setScriptStatusInMarkdown(raw: string, status: ScriptProductionStatus): string {
    const label = formatScriptStatus(status);
    const statusLine = `Status: ${label}`;
    const headerEnd = raw.search(/\n## /);
    const header = headerEnd >= 0 ? raw.slice(0, headerEnd) : raw;
    const rest = headerEnd >= 0 ? raw.slice(headerEnd) : '';

    if (/^Status:\s*.+$/m.test(header)) {
        return header.replace(/^Status:\s*.+$/m, statusLine) + rest;
    }

    const lines = header.split('\n');
    let lastMetaIndex = -1;
    lines.forEach((line, index) => {
        if (/^[A-Za-z ][A-Za-z ]*:\s*.+$/.test(line)) {
            lastMetaIndex = index;
        }
    });

    if (lastMetaIndex >= 0) {
        lines.splice(lastMetaIndex + 1, 0, statusLine);
    } else {
        lines.push(statusLine);
    }

    return `${lines.join('\n')}${rest}`;
}
