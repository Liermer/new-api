/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { queryOptions } from '@tanstack/react-query'
import i18next from 'i18next'

import { handleServerError } from '@/lib/handle-server-error'

import { getHomePageContent } from './api'

const STORAGE_KEY = 'home_page_content'

/**
 * The answer from the previous visit: the custom content, an empty string when
 * the site has none, or undefined when this browser has not asked yet.
 */
export function readCachedHomePageContent(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

function writeCachedHomePageContent(content: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, content)
  } catch {
    /* Storage can be unavailable in private mode. */
  }
}

/**
 * Never rejects: a failed refresh keeps what this browser already knows, so the
 * home page can always render.
 */
async function fetchHomePageContent(): Promise<string> {
  try {
    const { success, data } = await getHomePageContent()
    const content = success && data ? data : ''
    writeCachedHomePageContent(content)
    return content
  } catch (error) {
    handleServerError(error, i18next.t('Failed to load home page content'))
    return readCachedHomePageContent() ?? ''
  }
}

export const homePageContentQueryOptions = queryOptions({
  queryKey: ['home-page-content'],
  queryFn: fetchHomePageContent,
  initialData: readCachedHomePageContent,
  // The cached answer renders right away but is always stale, so it refreshes.
  initialDataUpdatedAt: 0,
})
