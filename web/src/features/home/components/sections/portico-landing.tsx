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
import {
  ArrowRight,
  BarChart3,
  Network,
  Plug,
  Scale,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'

type PorticoLandingProps = {
  isAuthenticated: boolean
}

/** Illustrative routing table shown beside the hero; decorative only. */
const ROUTES = [
  { model: 'gpt-4o', upstream: 'openai', latency: '412 ms', ok: true },
  {
    model: 'claude-sonnet-4',
    upstream: 'anthropic',
    latency: '688 ms',
    ok: true,
  },
  { model: 'gemini-2.5-pro', upstream: 'google', latency: '531 ms', ok: true },
  { model: 'deepseek-chat', upstream: 'deepseek', latency: '1.2 s', ok: false },
  { model: 'qwen-max', upstream: 'aliyun', latency: '476 ms', ok: true },
]

/**
 * PorticoLLM landing page: hero with a routing-table visual, a capability
 * grid and a three-step start. Replaces the stock home sections.
 */
export function PorticoLanding({ isAuthenticated }: PorticoLandingProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const docsUrl = (status?.docs_link as string | undefined) || ''

  const capabilities = [
    {
      icon: Plug,
      title: t('Multi-protocol Compatible'),
      desc: t('Compatible API routes for common AI application workflows'),
    },
    {
      icon: Scale,
      title: t('Load Balancing'),
      desc: t('Support for high concurrency with automatic load balancing'),
    },
    {
      icon: Wallet,
      title: t('Cost Tracking'),
      desc: t('Pay-as-you-go with real-time usage monitoring'),
    },
    {
      icon: Users,
      title: t('Team Collaboration'),
      desc: t('Multi-user management with flexible permission allocation'),
    },
    {
      icon: ShieldCheck,
      title: t('Secure & Reliable'),
      desc: t(
        'Enterprise-grade security with comprehensive permission management'
      ),
    },
    {
      icon: BarChart3,
      title: t('Monitor'),
      desc: t('Track usage, costs and performance with real-time analytics'),
    },
  ]

  const steps = [
    {
      title: t('Configure'),
      desc: t(
        'Add your API keys, set up channels and configure access permissions'
      ),
    },
    {
      title: t('Connect'),
      desc: t(
        'Connect through OpenAI, Claude, Gemini, and other compatible API routes'
      ),
    },
    {
      title: t('Monitor'),
      desc: t('Track usage, costs and performance with real-time analytics'),
    },
  ]

  return (
    <main className='relative'>
      <section className='border-border relative overflow-hidden border-b'>
        <div
          aria-hidden='true'
          className='absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] opacity-60'
        />
        <div className='max-w-container relative mx-auto grid gap-12 px-4 py-16 sm:px-8 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center'>
          <div className='space-y-7'>
            <p className='text-primary font-mono text-xs tracking-[0.06em] uppercase'>
              {t('Unified LLM gateway')}
            </p>
            <h1 className='max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
              {t('One API key for every model you run')}
            </h1>
            <p className='text-muted-foreground max-w-lg text-base leading-relaxed'>
              {t(
                'Access a vast selection of models via a standard, unified API protocol. Power AI applications, manage digital assets, and connect the Future.'
              )}
            </p>
            <div className='flex flex-wrap items-center gap-3'>
              {isAuthenticated ? (
                <Button size='lg' render={<Link to='/dashboard' />}>
                  {t('Go to Dashboard')}
                  <ArrowRight data-icon='inline-end' />
                </Button>
              ) : (
                <>
                  <Button size='lg' render={<Link to='/sign-up' />}>
                    {t('Get Started')}
                    <ArrowRight data-icon='inline-end' />
                  </Button>
                  <Button
                    size='lg'
                    variant='outline'
                    render={<Link to='/sign-in' />}
                  >
                    {t('Sign In')}
                  </Button>
                </>
              )}
              <Button size='lg' variant='ghost' render={<Link to='/pricing' />}>
                {t('Model Square')}
              </Button>
              {docsUrl && (
                <Button
                  size='lg'
                  variant='ghost'
                  render={
                    <a
                      href={docsUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                    />
                  }
                >
                  {t('Docs')}
                </Button>
              )}
            </div>
          </div>

          <div
            aria-hidden='true'
            className='bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1'
          >
            <div className='border-border flex items-center justify-between border-b px-4 py-2.5'>
              <span className='text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.06em] uppercase'>
                <Network className='size-3.5' />
                routes
              </span>
              <span className='text-success font-mono text-[11px]'>● live</span>
            </div>
            <ul className='divide-border divide-y font-mono text-[13px]'>
              {ROUTES.map((route) => (
                <li
                  key={route.model}
                  className='grid grid-cols-[minmax(0,1.3fr)_auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3'
                >
                  <span className='text-foreground truncate'>
                    {route.model}
                  </span>
                  <span className='text-muted-foreground'>→</span>
                  <span className='text-muted-foreground truncate'>
                    {route.upstream}
                  </span>
                  <span
                    className={route.ok ? 'text-foreground/80' : 'text-warning'}
                  >
                    {route.latency}
                  </span>
                </li>
              ))}
            </ul>
            <div className='border-border text-muted-foreground border-t px-4 py-2.5 font-mono text-[11px]'>
              POST /v1/chat/completions · 200 OK
            </div>
          </div>
        </div>
      </section>

      <section className='max-w-container mx-auto px-4 py-16 sm:px-8 md:py-20'>
        <h2 className='text-muted-foreground mb-8 font-mono text-xs tracking-[0.06em] uppercase'>
          {t('Core Features')}
        </h2>
        <div className='bg-border ring-border grid gap-px overflow-hidden rounded-xl ring-1 sm:grid-cols-2 lg:grid-cols-3'>
          {capabilities.map((item) => (
            <div key={item.title} className='bg-card space-y-3 p-6'>
              <item.icon className='text-primary size-5' aria-hidden='true' />
              <h3 className='text-base font-semibold'>{item.title}</h3>
              <p className='text-muted-foreground text-sm leading-relaxed'>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className='border-border border-t'>
        <div className='max-w-container mx-auto px-4 py-16 sm:px-8 md:py-20'>
          <div className='mb-10 space-y-2'>
            <h2 className='text-muted-foreground font-mono text-xs tracking-[0.06em] uppercase'>
              {t('How It Works')}
            </h2>
            <p className='text-2xl font-semibold tracking-tight'>
              {t('Three steps to get started')}
            </p>
          </div>
          <ol className='grid gap-8 md:grid-cols-3'>
            {steps.map((step, index) => (
              <li key={step.title} className='space-y-3'>
                <span className='text-primary font-mono text-sm'>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className='text-lg font-semibold'>{step.title}</h3>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  {step.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}
