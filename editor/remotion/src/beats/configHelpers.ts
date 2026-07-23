export function cfgBool(config: Record<string, unknown>, key: string, fallback = false): boolean {
    return typeof config[key] === 'boolean' ? (config[key] as boolean) : fallback;
}

export function cfgNumber(config: Record<string, unknown>, key: string, fallback: number): number {
    return typeof config[key] === 'number' && !Number.isNaN(config[key])
        ? (config[key] as number)
        : fallback;
}

export function cfgString(config: Record<string, unknown>, key: string): string | undefined {
    return typeof config[key] === 'string' ? (config[key] as string) : undefined;
}
