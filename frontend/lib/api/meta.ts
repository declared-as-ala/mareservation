import { apiGetRaw } from './client';
import type { HomepageConfig } from './types';

export async function fetchHomepageConfig(): Promise<HomepageConfig> {
  try {
    const res = await apiGetRaw<{ data?: HomepageConfig }>('/meta/homepage-config');
    if (res && typeof res === 'object' && 'data' in res) return (res as { data: HomepageConfig }).data;
    return (res as HomepageConfig) ?? {};
  } catch {
    return {};
  }
}
