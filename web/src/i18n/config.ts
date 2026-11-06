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
 *
 * 注意两个必须处理的时序问题（否则表现就是"切不到中文"）：
 *  1. i18n.init() 是异步的，初始化后才知道最终语言 —— 必须在 init 完成（或
 *     'initialized' 事件）里补加载，不能在 init 之后立刻读 i18n.language。
 *  2. addResourceBundle 不会触发 react-i18next 重渲染（那是 backend 加载完成的
 *     'loaded' 事件才会做的事）。资源晚到时界面会一直停在 fallback 英文，
 *     因此加载完成且当前语言命中时必须手动 emit('loaded')。
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
      // 语言包 JSON 自带 { "translation": { ... } } 包装（i18next 期望的
      // resources[lng][ns] 结构）。静态 import 时由 init 自动识别，改成
      // addResourceBundle 后必须自己剥掉外层，否则 key 会多一层 translation. 前缀，
      // 表现为「语言切了但文案全是英文 fallback」。
      const raw = (mod.default ?? mod) as Record<string, unknown>
      const bundle = (raw.translation as Record<string, unknown>) ?? raw
      i18n.addResourceBundle(code, 'translation', bundle, true, true)
      loadedLocales.add(code)

      // 资源晚到：若当前语言正是它，手动触发重渲染（等价于 backend 的 loaded 事件）
      if (toResourceLanguage(i18n.language) === code) {
        i18n.emit('loaded', {
          [code]: { translation: bundle },
        } as never)
      }
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

const initPromise = i18n
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

// 首次语言：init 完成后才知道最终值，这里再补加载一次
void initPromise.then(() => ensureLanguageResources(i18n.language))
i18n.on('initialized', () => {
  void ensureLanguageResources(i18n.language)
})
i18n.on('languageChanged', (lng) => {
  void ensureLanguageResources(lng)
})

/*
 * 切换语言时先补齐资源再真正切换，避免用户看到一次英文闪现。
 * 保持原 changeLanguage 的 Promise/callback 语义不变。
 */
const nativeChangeLanguage = i18n.changeLanguage.bind(i18n)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(i18n as any).changeLanguage = async (lng?: any, callback?: any) => {
  const target = Array.isArray(lng) ? lng[0] : lng
  if (typeof target === 'string' && target) {
    await ensureLanguageResources(target)
  }
  return nativeChangeLanguage(lng, callback)
}

export default i18n
