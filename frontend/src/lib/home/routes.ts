import { idPath } from './search';

// The new site lives in the "(site)" route group of src/app, so its pages are at the root: /, /search,
// /settings and so on. BASE_PATH is the prefix in front of every route. It is empty; it stays so that
// every link is built in one place and a prefix (for example a language, /en) could be added later.
export const BASE_PATH = '';

export const routes = {
  home: BASE_PATH || '/',
  search: `${BASE_PATH}/search`,
  searchIndex: `${BASE_PATH}/search-index`,
  settings: `${BASE_PATH}/settings`,
  signIn: `${BASE_PATH}/sign-in`,
  allSeries: `${BASE_PATH}/series`,
  series: (id: string) => `${BASE_PATH}/series/${id}`,
  round: (id: string) => `${BASE_PATH}/rounds/${idPath(id)}`,
  session: (id: string) => `${BASE_PATH}/sessions/${idPath(id)}`,
  about: `${BASE_PATH}/about`,
  data: `${BASE_PATH}/data`,
  contact: `${BASE_PATH}/contact`,
  legal: (slug: string) => `${BASE_PATH}/legal/${slug}`,
} as const;

/** Route params may or may not arrive percent-decoded; decoding twice is harmless for our ids. */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
