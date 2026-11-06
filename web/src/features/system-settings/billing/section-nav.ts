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
const BILLING_SECTIONS = [
  { id: 'quota', titleKey: 'Quota Settings' },
  { id: 'currency', titleKey: 'Currency & Display' },
  { id: 'model-pricing', titleKey: 'Model Pricing' },
  { id: 'group-pricing', titleKey: 'Group Pricing' },
  { id: 'payment', titleKey: 'Payment Gateway' },
  { id: 'checkin', titleKey: 'Check-in Rewards' },
] as const

export type BillingSectionId = (typeof BILLING_SECTIONS)[number]['id']

const billingNav = createSectionNav<BillingSectionId>({
  sections: BILLING_SECTIONS,
  defaultSection: 'quota',
  basePath: '/system-settings/billing',
  urlStyle: 'path',
})

export const BILLING_SECTION_IDS = billingNav.sectionIds
export const BILLING_DEFAULT_SECTION = billingNav.defaultSection
export const getBillingSectionNavItems = billingNav.getSectionNavItems
export const getBillingSectionMeta = billingNav.getSectionMeta
