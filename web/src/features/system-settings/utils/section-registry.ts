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
import type { TFunction } from 'i18next'
import type { ReactNode } from 'react'

/**
 * Section identity: what routes and the sidebar need to know about a section.
 */
export type SectionNavDefinition = {
  id: string
  titleKey: string
}

/**
 * Section body for settings pages
 */
export type SectionContentDefinition<
  TSectionId extends string,
  TSettings,
  TExtraArgs extends unknown[] = [],
> = {
  id: TSectionId
  build: (settings: TSettings, ...extraArgs: TExtraArgs) => ReactNode
}

/**
 * Section navigation configuration
 */
export type SectionNavConfig<
  TSectionId extends string,
  TSection extends SectionNavDefinition = SectionNavDefinition,
> = {
  sections: readonly TSection[]
  defaultSection: TSectionId
  basePath: string
  /** 'query' = `${basePath}?section=${id}`, 'path' = `${basePath}/${id}` */
  urlStyle?: 'query' | 'path'
}

/**
 * Create section navigation helpers.
 *
 * Route guards and the sidebar run on the initial load, so keep this free of
 * section components. Bodies belong in `createSectionContent`, whose module is
 * only reached from a lazy route component.
 */
export function createSectionNav<
  TSectionId extends string,
  TSection extends SectionNavDefinition = SectionNavDefinition,
>(config: SectionNavConfig<TSectionId, TSection>) {
  const { sections, defaultSection, basePath, urlStyle = 'query' } = config

  const sectionIds = sections.map((section) => section.id) as [
    TSectionId,
    ...TSectionId[],
  ]

  /**
   * Get navigation items for sidebar, with an optional badge per section
   */
  function getSectionNavItems(
    t: TFunction,
    badges?: Partial<Record<TSectionId, string>>
  ) {
    return sections.map((section) => ({
      title: t(section.titleKey),
      url:
        urlStyle === 'path'
          ? `${basePath}/${section.id}`
          : `${basePath}?section=${section.id}`,
      badge: badges?.[section.id as TSectionId],
    }))
  }

  function getSectionMeta(sectionId: TSectionId) {
    return sections.find((item) => item.id === sectionId) ?? sections[0]
  }

  return {
    sectionIds,
    defaultSection,
    getSectionNavItems,
    getSectionMeta,
  }
}

/**
 * Create the lookup that renders a section body by section ID
 */
export function createSectionContent<
  TSectionId extends string,
  TSettings,
  TExtraArgs extends unknown[] = [],
>(
  sections: readonly SectionContentDefinition<
    TSectionId,
    TSettings,
    TExtraArgs
  >[]
) {
  return function getSectionContent(
    sectionId: TSectionId,
    settings: TSettings,
    ...extraArgs: TExtraArgs
  ) {
    const section =
      sections.find((item) => item.id === sectionId) ?? sections[0]
    return section.build(settings, ...extraArgs)
  }
}
