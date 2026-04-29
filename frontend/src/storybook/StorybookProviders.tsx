import React, { useEffect } from 'react'
import { CssBaseline } from '@mui/material'
import ThemeGlobalStyles from '@/app/theme/ThemeGlobalStyles'
import { ThemeModeProvider, useThemeMode, type ThemeMode, theme } from '@/app/theme'

function ThemeModeSync({ mode, children }: { mode: ThemeMode; children: React.ReactNode }) {
  const { setMode } = useThemeMode()

  useEffect(() => {
    setMode(mode)
  }, [mode, setMode])

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: theme.spacing.xl,
        background: theme.colors.bgPage,
        color: theme.colors.textPrimary
      }}
    >
      {children}
    </div>
  )
}

export function StorybookProviders({
  children,
  mode = 'light'
}: {
  children: React.ReactNode
  mode?: ThemeMode
}) {
  return (
    <ThemeModeProvider>
      <CssBaseline />
      <ThemeGlobalStyles />
      <ThemeModeSync mode={mode}>{children}</ThemeModeSync>
    </ThemeModeProvider>
  )
}
