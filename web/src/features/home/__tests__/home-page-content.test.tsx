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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { api } from '@/lib/api'

import { useHomePageContent } from '../hooks'
import {
  homePageContentQueryOptions,
  readCachedHomePageContent,
} from '../query'

type MockableApi = { get: (url: string) => Promise<{ data: unknown }> }

const apiClient = api as unknown as MockableApi
const originalGet = apiClient.get
const STORAGE_KEY = 'home_page_content'

function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderHomePageContent(queryClient: QueryClient) {
  return renderHook(() => useHomePageContent(), {
    wrapper: (props: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    ),
  })
}

/** Answer `/api/home_page_content` only once the test says so. */
function deferHomePageResponse() {
  let respond = (_data: unknown) => {}
  let fail = (_error: Error) => {}
  apiClient.get = () =>
    new Promise((resolve, reject) => {
      respond = (data) => resolve({ data })
      fail = reject
    })
  return {
    respond: (data: unknown) => respond(data),
    fail: (error: Error) => fail(error),
  }
}

describe('home page content', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    apiClient.get = originalGet
    localStorage.clear()
  })

  test('holds a first visit until the server answers, then remembers the answer', async () => {
    const server = deferHomePageResponse()
    const { result } = renderHomePageContent(createQueryClient())

    expect(result.current.isLoaded).toBe(false)

    server.respond({ success: true, data: '' })

    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.content).toBe('')
    expect(readCachedHomePageContent()).toBe('')
  })

  test('shows a returning visitor the default page at once when the site has no custom page', () => {
    localStorage.setItem(STORAGE_KEY, '')
    deferHomePageResponse()

    const { result } = renderHomePageContent(createQueryClient())

    expect(result.current.isLoaded).toBe(true)
    expect(result.current.content).toBe('')
  })

  test('shows a returning visitor the custom page at once and refreshes it behind the scenes', async () => {
    localStorage.setItem(STORAGE_KEY, '# Old')
    const server = deferHomePageResponse()

    const { result } = renderHomePageContent(createQueryClient())

    expect(result.current.isLoaded).toBe(true)
    expect(result.current.content).toBe('# Old')

    server.respond({ success: true, data: '# New' })

    await waitFor(() => expect(result.current.content).toBe('# New'))
    expect(readCachedHomePageContent()).toBe('# New')
  })

  test('falls back to the default page when the admin removes the custom page', async () => {
    localStorage.setItem(STORAGE_KEY, '# Old')
    const server = deferHomePageResponse()

    const { result } = renderHomePageContent(createQueryClient())
    server.respond({ success: true, data: '' })

    await waitFor(() => expect(result.current.content).toBe(''))
    expect(readCachedHomePageContent()).toBe('')
  })

  test('keeps the cached page when a refresh fails', async () => {
    localStorage.setItem(STORAGE_KEY, '# Old')
    const server = deferHomePageResponse()
    const queryClient = createQueryClient()

    const { result } = renderHomePageContent(queryClient)
    server.fail(new Error('network down'))

    await waitFor(() =>
      expect(
        queryClient.getQueryState(homePageContentQueryOptions.queryKey)
          ?.dataUpdatedAt
      ).toBeGreaterThan(0)
    )
    expect(result.current.isLoaded).toBe(true)
    expect(result.current.content).toBe('# Old')
    expect(readCachedHomePageContent()).toBe('# Old')
  })

  test('renders the default page when a first visit cannot reach the server', async () => {
    const server = deferHomePageResponse()

    const { result } = renderHomePageContent(createQueryClient())
    server.fail(new Error('network down'))

    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.content).toBe('')
  })
})
