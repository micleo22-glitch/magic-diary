export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs-scroll" style={{ overflowY: 'auto', height: '100dvh', background: '#fff' }}>
      {children}
    </div>
  )
}
