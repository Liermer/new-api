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
import { createSectionNav } from '../utils/section-registry'

/**
 * Section ids and titles only. Route guards and the sidebar read this on every
 * page, so it must not import section components (see section-registry.tsx).
 */
const SECURITY_SECTIONS = [
  { id: 'rate-limit', titleKey: 'Rate Limiting' },
  { id: 'ssrf', titleKey: 'SSRF Protection' },
  { id: 'token-limits', titleKey: 'Token Limits' },
] as const

export type SecuritySectionId = (typeof SECURITY_SECTIONS)[number]['id']

const securityNav = createSectionNav<SecuritySectionId>({
  sections: SECURITY_SECTIONS,
  defaultSection: 'rate-limit',
  basePath: '/system-settings/security',
  urlStyle: 'path',
})

export const SECURITY_SECTION_IDS = securityNav.sectionIds
export const SECURITY_DEFAULT_SECTION = securityNav.defaultSection
export const getSecuritySectionNavItems = securityNav.getSectionNavItems
export const getSecuritySectionMeta = securityNav.getSectionMeta
