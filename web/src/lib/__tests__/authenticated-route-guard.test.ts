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
import { QueryClient } from '@tanstack/react-query'
import { isRedirect } from '@tanstack/react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { Route } from '../../routes/_authenticated/route'

vi.mock('@/lib/auth-session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-session')>()),
  // The server said no: whoever is visiting has no session.
  resolveAuthentication: vi.fn(async () => ({ kind: 'anonymous' })),
}))

type MockableApi = { get: (url: string) => Promise<{ data: unknown }> }
type Guard = (options: {
  context: { queryClient: QueryClient }
  location: { pathname: string; href: string }
}) => Promise<void>

const apiClient = api as unknown as MockableApi
const originalGet = apiClient.get
const location = { pathname: '/dashboard/overview', href: '/dashboard/overview' }

async function redirectTarget(): Promise<unknown> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const guard = Route.options.beforeLoad as unknown as Guard
  try {
    await guard({ context: { queryClient }, location })
  } catch (thrown) {
    if (isRedirect(thrown)) return thrown.options.to
    throw thrown
  }
  return null
}

describe('authenticated route guard', () => {
  beforeEach(() => {
    useAuthStore.setState((state) => ({
      auth: { ...state.auth, user: null, accessToken: '' },
    }))
  })

  afterEach(() => {
    apiClient.get = originalGet
    vi.restoreAllMocks()
  })

  test('sends an anonymous visitor to the wizard while the site is uninitialized', async () => {
    apiClient.get = async () => ({
      data: { success: true, data: { setup: false } },
    })

    expect(await redirectTarget()).toBe('/setup')
  })

  test('sends an anonymous visitor to sign in once the site is initialized', async () => {
    apiClient.get = async () => ({
      data: { success: true, data: { setup: true } },
    })

    expect(await redirectTarget()).toBe('/sign-in')
  })

  test('sends an anonymous visitor to sign in when the status cannot be read', async () => {
    apiClient.get = async () => {
      throw new Error('network down')
    }

    expect(await redirectTarget()).toBe('/sign-in')
  })

  test('lets a signed-in visitor through without reading the status', async () => {
    const statusRead = vi.fn()
    apiClient.get = statusRead
    useAuthStore.setState((state) => ({
      auth: {
        ...state.auth,
        user: { id: 1, username: 'admin', role: 100 },
        accessToken: 'token',
      },
    }))

    expect(await redirectTarget()).toBe(null)
    expect(statusRead).not.toHaveBeenCalled()
  })
})
