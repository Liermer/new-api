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
const MODELS_SECTIONS = [
  { id: 'global', titleKey: 'Global Model Configuration' },
  { id: 'gemini', titleKey: 'Gemini' },
  { id: 'claude', titleKey: 'Claude' },
  { id: 'grok', titleKey: 'Grok' },
  { id: 'model-deployment', titleKey: 'Model Deployment' },
] as const

export type ModelSectionId = (typeof MODELS_SECTIONS)[number]['id']

const modelsNav = createSectionNav<ModelSectionId>({
  sections: MODELS_SECTIONS,
  defaultSection: 'global',
  basePath: '/system-settings/models',
  urlStyle: 'path',
})

export const MODELS_SECTION_IDS = modelsNav.sectionIds
export const MODELS_DEFAULT_SECTION = modelsNav.defaultSection
export const getModelsSectionNavItems = modelsNav.getSectionNavItems
export const getModelsSectionMeta = modelsNav.getSectionMeta
