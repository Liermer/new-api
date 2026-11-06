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
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { convertDetectedLanguage } from './languages'
import en from './locales/en.json'

/*
 * 语言包按需加载（性能优化）
 *
 * 现状：7 个语言包共约 4.3 MB 原始 JSON，若全部静态 import 会全部打进首屏主 chunk。
 * 改为：仅 en（fallback）随主包同步加载，其余语言在真正需要时异步拉取独立 chunk。
 * 这样中文用户首屏只多下载 ~530 KB（gzip 后约 110 KB），其余 5 个语言永不下载。
 */
const lazyLoaders = {
  zhCN: () => import('./locales/zh.json'),
  zhTW: () => import('./locales/zh-TW.json'),
  fr: () => import('./locales/fr.json'),
  ja: () => import('./locales/ja.json'),
  ru: () => import('./locales/ru.json'),
  vi: () => import('./locales/vi.json'),
} as const

export type LazyLanguage = keyof typeof lazyLoaders
export type AppLanguage = LazyLanguage | 'en'

/** 浏览器/存储里拿到的语言码归一化到资源键 */
export function toResourceLanguage(lng?: string | null): AppLanguage {
  if (!lng) return 'en'
  const raw = lng.replaceAll('_', '-').toLowerCase()
  if (raw === 'zhcn' || raw === 'zh' || raw === 'zh-cn' || raw === 'zh-hans') return 'zhCN'
  if (raw === 'zhtw' || raw === 'zh-tw' || raw === 'zh-hk' || raw === 'zh-mo' || raw === 'zh-hant')
    return 'zhTW'
  if (raw.startsWith('fr')) return 'fr'
  if (raw.startsWith('ja')) return 'ja'
  if (raw.startsWith('ru')) return 'ru'
  if (raw.startsWith('vi')) return 'vi'
  return 'en'
}

const loadedLocales = new Set<AppLanguage>(['en'])
const inflight = new Map<AppLanguage, Promise<void>>()

/** 确保某个语言的资源已注册到 i18next；重复调用安全。 */
export function ensureLanguageResources(lng?: string | null): Promise<void> {
  const code = toResourceLanguage(lng)
  if (loadedLocales.has(code)) return Promise.resolve()
  const existing = inflight.get(code)
  if (existing) return existing

  const loader = (lazyLoaders as Record<string, () => Promise<{ default: unknown }>>)[code]
  if (!loader) {
    loadedLocales.add(code)
    return Promise.resolve()
  }

  const task = loader()
    .then((mod) => {
      i18n.addResourceBundle(code, 'translation', mod.default ?? mod, true, true)
      loadedLocales.add(code)
    })
    .catch((err) => {
      // 语言包加载失败不应阻塞界面：回落到 en
      console.warn(`[i18n] failed to load locale "${code}"`, err)
      loadedLocales.add(code)
    })
    .finally(() => {
      inflight.delete(code)
    })

  inflight.set(code, task)
  return task
}

export const resources = {
  en,
} as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'zhCN', 'fr', 'ru', 'ja', 'vi', 'zhTW'],
    load: 'currentOnly',
    nsSeparator: false, // Allow literal colons in keys (e.g., URLs, labels)
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      // Browsers report `zh-CN`/`zh-TW`/`zh`; map them onto our `zhCN`/`zhTW`
      // codes (non-Chinese codes pass through for normal supportedLngs matching).
      convertDetectedLanguage,
    },
    react: {
      // 语言包异步补齐时不要因缺 key 抛 suspense
      useSuspense: false,
    },
  })

// 首屏语言：检测到的语言如果不是 en，异步补齐资源后 i18next 会自动重渲染
void ensureLanguageResources(i18n.language)

i18n.on('languageChanged', (lng) => {
  void ensureLanguageResources(lng)
})

export default i18n
