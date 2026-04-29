import { useAuth } from '@/core/auth/authContext'
import PlatformLayout from '@/layouts/PlatformLayout'
import { AccessDeniedState } from '@/components/navigation'

export default function AccessDeniedScreen() {
  const { me } = useAuth()

  return (
    <PlatformLayout>
      <div style={{ maxWidth: 640, margin: '48px auto' }}>
        <AccessDeniedState email={me?.email} userId={me?.userId} />
      </div>
    </PlatformLayout>
  )
}
