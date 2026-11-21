'use client'

import { useLayoutEffect } from 'react'

// Active le thème sombre sur <html> pendant la durée de vie de l'admin : les
// modales/menus Radix sont rendus dans des portails sous <body>, hors du layout.
export function AdminDarkMode() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const hadDark = root.classList.contains('dark')
    root.classList.add('dark')
    return () => {
      if (!hadDark) root.classList.remove('dark')
    }
  }, [])

  return null
}
