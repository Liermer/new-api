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
import { describe, expect, test } from 'vitest'

import { AUTH_SECTION_IDS } from '../auth/section-nav'
import { getAuthSectionContent } from '../auth/section-registry'
import { BILLING_SECTION_IDS } from '../billing/section-nav'
import { getBillingSectionContent } from '../billing/section-registry'
import { CONTENT_SECTION_IDS } from '../content/section-nav'
import { getContentSectionContent } from '../content/section-registry'
import { MODELS_SECTION_IDS } from '../models/section-nav'
import { getModelsSectionContent } from '../models/section-registry'
import { OPERATIONS_SECTION_IDS } from '../operations/section-nav'
import { getOperationsSectionContent } from '../operations/section-registry'
import { POLICY_SECTION_IDS } from '../request-policies/section-nav'
import { getPolicySectionContent } from '../request-policies/section-registry'
import { SECURITY_SECTION_IDS } from '../security/section-nav'
import { getSecuritySectionContent } from '../security/section-registry'
import { SITE_SECTION_IDS } from '../site/section-nav'
import { getSiteSectionContent } from '../site/section-registry'

type RenderSection = (id: string, settings: never, ...rest: never[]) => unknown

const SETTINGS_PAGES: [string, readonly string[], RenderSection][] = [
  ['auth', AUTH_SECTION_IDS, getAuthSectionContent as RenderSection],
  ['billing', BILLING_SECTION_IDS, getBillingSectionContent as RenderSection],
  ['content', CONTENT_SECTION_IDS, getContentSectionContent as RenderSection],
  ['models', MODELS_SECTION_IDS, getModelsSectionContent as RenderSection],
  [
    'operations',
    OPERATIONS_SECTION_IDS,
    getOperationsSectionContent as RenderSection,
  ],
  [
    'request-policies',
    POLICY_SECTION_IDS,
    getPolicySectionContent as RenderSection,
  ],
  [
    'security',
    SECURITY_SECTION_IDS,
    getSecuritySectionContent as RenderSection,
  ],
  ['site', SITE_SECTION_IDS, getSiteSectionContent as RenderSection],
]

describe('settings section navigation', () => {
  test.each(SETTINGS_PAGES)(
    '%s: every sidebar entry opens its own section',
    (_name, sectionIds, renderSection) => {
      const render = (id: string) => renderSection(id, {} as never)
      const first = render(sectionIds[0])

      // An id without a body falls back to the first section's content.
      for (const id of sectionIds.slice(1)) {
        expect(render(id), id).not.toEqual(first)
      }
    }
  )

  test('route files and the sidebar config never import a section registry', () => {
    // Route guards and the sidebar are part of the entry chunk and the layout
    // chunk every page loads. A registry import there ships every settings
    // panel to anonymous visitors, so these files must use section-nav instead.
    const sources = import.meta.glob(
      [
        '/src/routes/**/*.tsx',
        '/src/components/layout/config/system-settings.config.ts',
      ],
      { query: '?raw', import: 'default', eager: true }
    ) as Record<string, string>

    expect(Object.keys(sources).length).toBeGreaterThan(50)
    const offenders = Object.entries(sources)
      .filter(([, source]) =>
        /system-settings\/[a-z-]+\/section-registry/.test(source)
      )
      .map(([file]) => file)
    expect(offenders).toEqual([])
  })
})
