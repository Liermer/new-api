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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

type AuthLayoutProps = {
  children: React.ReactNode
}

const SAMPLE_REQUEST = [
  { prompt: true, text: 'curl https://your-host/v1/chat/completions \\' },
  { prompt: false, text: '  -H "Authorization: Bearer sk-••••" \\' },
  { prompt: false, text: `  -d '{"model": "gpt-4o", "messages": [...]}'` },
]

/**
 * Shared shell for every auth screen (sign-in, sign-up, OTP, reset…).
 * Console redesign: form column on the left, a quiet product panel on the
 * right from `lg` up. The panel is decorative and hidden from assistive tech
 * except for its heading copy.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()

  const features = [
    t('OpenAI-compatible endpoints'),
    t('Route across channels and models'),
    t('Quota, usage logs and billing'),
  ]

  return (
    <div className='grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]'>
      <div className='relative flex flex-col'>
        <Link
          to='/'
          className='flex items-center gap-2.5 px-4 pt-4 transition-opacity hover:opacity-80 sm:px-8 sm:pt-8'
        >
          <div className='relative size-8'>
            {loading ? (
              <Skeleton className='absolute inset-0 rounded-lg' />
            ) : (
              <img
                src={logo}
                alt={t('Logo')}
                className='size-8 rounded-lg object-cover'
              />
            )}
          </div>
          {loading ? (
            <Skeleton className='h-6 w-24' />
          ) : (
            <h1 className='text-lg font-semibold tracking-tight'>
              {systemName}
            </h1>
          )}
        </Link>
        <div className='flex flex-1 items-center'>
          <div className='mx-auto flex w-full flex-col justify-center space-y-2 px-4 py-8 sm:w-[440px] sm:p-8'>
            {children}
          </div>
        </div>
      </div>

      <aside className='bg-sidebar border-border relative hidden overflow-hidden border-s lg:flex lg:flex-col lg:justify-center'>
        <div
          aria-hidden='true'
          className='absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] opacity-70'
        />
        <div className='relative mx-auto w-full max-w-lg space-y-8 px-12'>
          <div className='space-y-3'>
            <p className='text-primary font-mono text-xs tracking-[0.06em] uppercase'>
              {t('Unified LLM gateway')}
            </p>
            <h2 className='text-3xl font-semibold tracking-tight text-balance'>
              {t('One API key for every model you run')}
            </h2>
          </div>

          <div
            aria-hidden='true'
            className='bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1'
          >
            <div className='border-border flex items-center gap-1.5 border-b px-4 py-2.5'>
              <span className='bg-muted-foreground/40 size-2 rounded-full' />
              <span className='bg-muted-foreground/40 size-2 rounded-full' />
              <span className='bg-muted-foreground/40 size-2 rounded-full' />
              <span className='text-muted-foreground ms-2 font-mono text-[11px]'>
                bash
              </span>
            </div>
            <pre className='overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-6'>
              {SAMPLE_REQUEST.map((line) => (
                <div key={line.text} className='whitespace-pre'>
                  {line.prompt ? (
                    <span className='text-chart-2 select-none'>$ </span>
                  ) : (
                    <span className='select-none'>{'  '}</span>
                  )}
                  <span className='text-foreground/90'>{line.text}</span>
                </div>
              ))}
              <div className='text-success mt-2 whitespace-pre'>
                {'  '}200 OK · 412 ms · 1,284 tokens
              </div>
            </pre>
          </div>

          <ul className='space-y-2.5'>
            {features.map((feature) => (
              <li
                key={feature}
                className='text-muted-foreground flex items-center gap-3 text-sm'
              >
                <span
                  aria-hidden='true'
                  className='bg-primary size-1.5 shrink-0 rounded-[1px]'
                />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
