import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { AuditProgress } from '@/features/seo-audit'

export const Route = createFileRoute('/_authenticated/audits/$auditId/processing')({
  component: ProcessingPage,
})

function ProcessingPage() {
  const { auditId } = Route.useParams()

  return (
    <>
      <Header fixed>
        <h1 className='text-lg font-semibold'>Processing Audit</h1>
      </Header>
      <Main>
        <AuditProgress auditId={auditId} />
      </Main>
    </>
  )
}
