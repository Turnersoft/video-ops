/** Filming pace for teleprompter beats — override per script in `teleprompter.pace`. */
export type TeleprompterSpeechPace = {
    /** Primary driver when set (syllables per second of spoken `say` text). */
    syllablesPerSecond?: number;
    /** Fallback when `syllablesPerSecond` is omitted. */
    wordsPerSecond?: number;
    /** Breathing room after each beat line finishes. */
    pauseAfterBeat?: number;
    /** Floor for empty or very short lines. */
    minBeatSeconds?: number;
    /** Scale whole script (e.g. 356/262 for filmed vs draft). */
    paceFactor?: number;
};

export const DEFAULT_SPEECH_PACE: TeleprompterSpeechPace = {
    syllablesPerSecond: 3.4,
    pauseAfterBeat: 0.45,
    minBeatSeconds: 5,
    paceFactor: 1,
};

/** Compare clips filmed at phone-recording pace (formerly `*-60s` scripts). */
const SETS_V2_COMPARE_PACE_SCRIPTS = new Set([
    'sets-v2-01-set',
    'sets-v2-02-subset',
    'sets-v2-03-proper-subset',
]);

/** Per-script defaults when `teleprompter.pace` is not authored. */
export function defaultSpeechPaceForScript(scriptId: string): TeleprompterSpeechPace {
    if (SETS_V2_COMPARE_PACE_SCRIPTS.has(scriptId) || scriptId.includes('-60s')) {
        return {
            syllablesPerSecond: 3.6,
            pauseAfterBeat: 0.4,
            minBeatSeconds: 4,
            paceFactor: 1,
        };
    }
    if (scriptId.startsWith('sets-v2-')) {
        return {
            wordsPerSecond: 2.4,
            pauseAfterBeat: 0.5,
            minBeatSeconds: 5,
            paceFactor: 356 / 262,
        };
    }
    return { ...DEFAULT_SPEECH_PACE };
}

/** Optional header in script.md: `Pace: 3.5 syllables/s` or `Pace: 2.4 wps`. */
export function parseSpeechPaceFromScriptMarkdown(markdown: string | undefined): TeleprompterSpeechPace {
    if (!markdown) {
        return {};
    }
    const header = markdown.split(/\n(?=## )/)[0] ?? markdown;
    const resolved: TeleprompterSpeechPace = {};

    const syllablesLine = header.match(/^Syllables per second:\s*([\d.]+)\s*$/im);
    if (syllablesLine) {
        resolved.syllablesPerSecond = Number(syllablesLine[1]);
    }

    const paceLine = header.match(/^Pace:\s*([\d.]+)\s*(.+)?$/im);
    if (paceLine) {
        const value = Number(paceLine[1]);
        const unit = (paceLine[2] ?? '').toLowerCase();
        if (unit.includes('wps') || unit.includes('word')) {
            resolved.wordsPerSecond = value;
        } else {
            resolved.syllablesPerSecond = value;
        }
    }

    return resolved;
}

export function resolveSpeechPace(
    scriptId: string,
    teleprompter?: { pace?: TeleprompterSpeechPace },
    scriptMarkdown?: string,
): TeleprompterSpeechPace {
    return {
        ...defaultSpeechPaceForScript(scriptId),
        ...parseSpeechPaceFromScriptMarkdown(scriptMarkdown),
        ...teleprompter?.pace,
    };
}

export function countSpeechWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
}

/** English heuristic — good enough for teleprompter timing. */
export function countSpeechSyllables(text: string): number {
    const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
    return words.reduce((total, word) => total + estimateWordSyllables(word), 0);
}

function estimateWordSyllables(word: string): number {
    if (word.length <= 3) {
        return 1;
    }
    const stripped = word.replace(/e$/u, '');
    const groups = stripped.match(/[aeiouy]+/gu);
    return Math.max(1, groups?.length ?? 1);
}

/** `max(minBeatSeconds, round((speechSeconds + pauseAfterBeat) × paceFactor))`. */
export function estimateBeatDurationSeconds(
    say: string,
    pace?: TeleprompterSpeechPace,
): number {
    const resolved = { ...DEFAULT_SPEECH_PACE, ...pace };
    const factor = resolved.paceFactor ?? 1;
    const pause = resolved.pauseAfterBeat ?? 0;
    const min = resolved.minBeatSeconds ?? 1;
    const text = say.trim();
    if (!text) {
        return min;
    }

    let speechSeconds: number;
    if (resolved.syllablesPerSecond && resolved.syllablesPerSecond > 0) {
        speechSeconds = countSpeechSyllables(text) / resolved.syllablesPerSecond;
    } else {
        speechSeconds = countSpeechWords(text) / (resolved.wordsPerSecond ?? 2.4);
    }

    return Math.max(min, Math.round((speechSeconds + pause) * factor));
}

export function recomputeCompareBeatDurations<T extends { say: string; durationSeconds: number }>(
    beats: T[],
    pace?: TeleprompterSpeechPace,
): T[] {
    return beats.map((beat) => ({
        ...beat,
        durationSeconds: estimateBeatDurationSeconds(beat.say, pace),
    }));
}

/** v2 director.say lines → cumulative sayTimings + scene duration. */
export function recomputeDirectorSayTimings(
    say: string[],
    pace?: TeleprompterSpeechPace,
): { sayTimings: number[]; durationSeconds: number; lineDurations: number[] } {
    if (say.length === 0) {
        return { sayTimings: [], durationSeconds: 0, lineDurations: [] };
    }

    const lineDurations = say.map((line) => estimateBeatDurationSeconds(line, pace));
    const sayTimings = [0];
    let elapsed = 0;
    for (let index = 0; index < lineDurations.length - 1; index += 1) {
        elapsed += lineDurations[index];
        sayTimings.push(Math.round(elapsed));
    }
    const durationSeconds = Math.round(elapsed + lineDurations[lineDurations.length - 1]);
    return { sayTimings, durationSeconds, lineDurations };
}
