// The localStorage keys of this app. A plain module on purpose: the hooks live in 'use client'
// files, and a Server Component (the cookie page lists the keys) cannot read a plain value
// that is exported from a client file.
export const SETTINGS_KEY = 'opengp.settings.v1';
export const FOLLOWING_KEY = 'opengp.following.v1';
