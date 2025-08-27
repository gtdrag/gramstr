'use client'

import { useEffect, useState } from 'react'

export function useElectron() {
  const [isElectron, setIsElectron] = useState(false)
  
  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!(window as any).electron?.isElectron)
  }, [])

  const openInBrowser = (url?: string) => {
    const targetUrl = url || window.location.href
    if ((window as any).electron?.openExternal) {
      (window as any).electron.openExternal(targetUrl)
      return true
    }
    return false
  }

  return {
    isElectron,
    openInBrowser,
  }
}