import React from 'react'
import PlatformLayout from './PlatformLayout'

export default function PublicStoreLayout({ children }: { children: React.ReactNode }) {
  return <PlatformLayout>{children}</PlatformLayout>
}
