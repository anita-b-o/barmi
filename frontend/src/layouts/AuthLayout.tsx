import React from 'react'
import PlatformLayout from './PlatformLayout'
import { theme } from '../app/theme'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformLayout>
      <div style={{ maxWidth: 480, margin: '0 auto', paddingTop: theme.spacing.xxl }}>
        {children}
      </div>
    </PlatformLayout>
  )
}
