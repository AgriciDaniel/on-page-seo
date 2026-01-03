import { ContentSection } from '../components/content-section'
import { ApiKeysForm } from './api-keys-form'

export default function SettingsApiKeys() {
  return (
    <ContentSection
      title='API Keys'
      desc='Configure your API keys for Firecrawl and DataForSEO services.'
    >
      <ApiKeysForm />
    </ContentSection>
  )
}
