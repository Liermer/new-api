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
import { afterEach, describe, expect, test, vi } from 'vitest'

import zh from '../locales/zh.json'

const STORED_LANGUAGE_KEY = 'i18nextLng'

describe('interface language', () => {
  afterEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  test('translates to Chinese as soon as the module loads, with no async step', async () => {
    const { default: i18n } = await import('../config')

    expect(i18n.isInitialized).toBe(true)
    expect(i18n.language).toBe('zhCN')
    expect(i18n.t('Sign in')).toBe(zh.translation['Sign in'])
  })

  test('ignores a language stored by an earlier version of the site', async () => {
    localStorage.setItem(STORED_LANGUAGE_KEY, 'en')

    const { default: i18n } = await import('../config')

    expect(i18n.language).toBe('zhCN')
    expect(i18n.t('Sign in')).toBe(zh.translation['Sign in'])
  })

  test('renders a key missing from the locale as its English source text', async () => {
    const { default: i18n } = await import('../config')

    expect(i18n.t('Not in the locale: {{name}}', { name: 'x' })).toBe(
      'Not in the locale: x'
    )
  })
})
