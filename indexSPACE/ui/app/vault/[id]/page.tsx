import { Terminal } from '@/components/indexspace/terminal'

export default async function VaultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <Terminal initialVaultId={id} />
}
