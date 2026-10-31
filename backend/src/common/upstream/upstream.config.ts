// Upstream endpoints and identification. No credentials are needed for the
// free Jolpica / OpenF1 tiers used here; nothing secret is read or logged.

export const UPSTREAM_CONFIG = Symbol('OPENGP_UPSTREAM_CONFIG');

export interface UpstreamConfig {
  jolpicaBaseUrl: string;
  openf1BaseUrl: string;
  /** Jolpica asks clients to send an identifying User-Agent. */
  userAgent: string;
}

export const DEFAULT_UPSTREAM_CONFIG: UpstreamConfig = {
  jolpicaBaseUrl: 'https://api.jolpi.ca/ergast/f1',
  openf1BaseUrl: 'https://api.openf1.org/v1',
  userAgent: 'OpenGP/0.0.1 (+https://github.com/zhangxijing97/opengp)',
};

function readUrl(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  return /^https?:\/\/[^\s]+$/.test(trimmed) ? trimmed : fallback;
}

export function loadUpstreamConfig(
  env: Record<string, string | undefined> = process.env,
): UpstreamConfig {
  const userAgent = env.OPENGP_USER_AGENT?.trim();
  return {
    jolpicaBaseUrl: readUrl(
      env.OPENGP_JOLPICA_BASE_URL,
      DEFAULT_UPSTREAM_CONFIG.jolpicaBaseUrl,
    ),
    openf1BaseUrl: readUrl(
      env.OPENGP_OPENF1_BASE_URL,
      DEFAULT_UPSTREAM_CONFIG.openf1BaseUrl,
    ),
    userAgent:
      userAgent && userAgent.length > 0
        ? userAgent
        : DEFAULT_UPSTREAM_CONFIG.userAgent,
  };
}
