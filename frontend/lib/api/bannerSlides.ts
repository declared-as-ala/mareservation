import { apiGetRaw } from './client';
import type { BannerSlide } from './types';

/** Fetches active banner slides from meta homepage-config or dedicated endpoint. */
export async function fetchBannerSlides(): Promise<BannerSlide[]> {
  try {
    const res = await apiGetRaw<{ data?: { bannerSlides?: BannerSlide[] } }>('/meta/homepage-config');
    const data = (res as { data?: { bannerSlides?: BannerSlide[] } })?.data;
    const slides = data?.bannerSlides;
    if (Array.isArray(slides)) {
      return slides.filter((s) => s.isActive).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    return [];
  } catch {
    return [];
  }
}
