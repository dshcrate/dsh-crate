import { marketFetch } from './net.ts';
/**
 * The anonymous daily count.
 *
 * One POST per install per UTC day, from the Node side only, carrying exactly
 * five fields (see `Ping`). It is OFF by default and only runs after the user
 * turns it on in the settings card; `DSH_CRATE_TELEMETRY=0` and
 * `DO_NOT_TRACK=1` always win. Everything about it is best effort: a failure
 * changes nothing for the user and is never an error.
 */
export declare const TELEMETRY_URL = "https://dshcrate.com/api/telemetry";
/** The whole payload. Adding a field here is a privacy change: update SECURITY.md. */
export interface Ping {
    id: string;
    v: string;
    hv: string | null;
    kind: 'desktop' | 'web';
    region: string;
}
interface TelemetryState {
    id?: string;
    lastDay?: string;
    enabled: boolean;
}
export declare function telemetryFile(home?: string): string;
export declare function readTelemetryState(file?: string): TelemetryState;
/** Turn the count on or off. Keeps the rest of the file; deletes nothing else. */
export declare function setTelemetryEnabled(enabled: boolean, file?: string): void;
/** Why nothing may be sent right now, or null. Explicit opt-outs always win. */
export declare function suppressedBy(env: Record<string, string | undefined>): string | null;
export interface HeartbeatOptions {
    version: string;
    hostVersion: () => string | null;
    kind: () => 'desktop' | 'web';
    region: () => string;
    file?: string;
    env?: Record<string, string | undefined>;
    now?: () => number;
    fetch?: typeof marketFetch;
}
/** Send today's count if it is due. Never throws. */
export declare function sendHeartbeat(options: HeartbeatOptions): Promise<'sent' | 'skipped' | 'failed'>;
/** Start the schedule: first check after a short delay, then every ~6 hours. */
export declare function startHeartbeat(options: HeartbeatOptions, delayMs?: number, everyMs?: number): () => void;
export {};
