'use client'

import { useEffect, type ReactNode } from 'react'
import { createDemoMetaStateStore } from '../../../meta-state/demo-fixture'
import type { MetaStateStore } from '../../../meta-state/store'
import { bindMetaStateShell } from '../../wiring/meta-state-shell-binding'

const defaultStore = createDemoMetaStateStore()

export function MetaStateProvider({ children, store = defaultStore }: { children: ReactNode; store?: MetaStateStore }) {
  useEffect(() => {
    const binding = bindMetaStateShell(store)
    return () => binding.unbind()
  }, [store])
  return <>{children}</>
}
