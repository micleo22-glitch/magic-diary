'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Copy, Check, ChevronRight, Key, Wand2, BookOpen, MessageSquare, Plus, Search, ExternalLink } from 'lucide-react'

type Tab = 'api' | 'mcp'
type Section = 'create' | 'ask' | 'read'

function useToken() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null)
      setLoading(false)
    })
  }, [])
  return { token, loading }
}

function CopyButton({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1 transition-colors"
      style={{ color: copied ? '#000' : '#666', fontSize: small ? 11 : 12 }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="rounded-lg overflow-hidden my-4" style={{ border: '1px solid #e5e5e5' }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ background: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#888' }}>{language}</span>
        <CopyButton text={code} small />
      </div>
      <pre className="p-4 overflow-x-auto" style={{ background: '#111', fontFamily: '"Geist Mono", "Fira Code", monospace', fontSize: 13, color: '#e5e5e5', lineHeight: 1.65, margin: 0 }}>
        <code suppressHydrationWarning>{code}</code>
      </pre>
    </div>
  )
}

function MethodBadge({ method }: { method: 'POST' | 'GET' }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-xs font-bold"
      style={{
        fontFamily: 'monospace',
        background: method === 'POST' ? '#eff6ff' : '#f0fdf4',
        color: method === 'POST' ? '#1d4ed8' : '#15803d',
        border: `1px solid ${method === 'POST' ? '#bfdbfe' : '#bbf7d0'}`,
      }}>
      {method}
    </span>
  )
}

function ToolBadge() {
  return (
    <span className="px-1.5 py-0.5 rounded text-xs font-bold"
      style={{ fontFamily: 'monospace', background: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>
      TOOL
    </span>
  )
}

function ParamTable({ rows }: { rows: { name: string; type: string; required?: boolean; desc: string }[] }) {
  return (
    <div className="rounded-lg overflow-hidden my-4" style={{ border: '1px solid #e5e5e5' }}>
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
            <th className="px-4 py-2 text-left" style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', width: '30%' }}>Parametr</th>
            <th className="px-4 py-2 text-left" style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', width: '20%' }}>Typ</th>
            <th className="px-4 py-2 text-left" style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opis</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.name} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
              <td className="px-4 py-3">
                <code style={{ fontFamily: 'monospace', fontSize: 13, color: '#111' }}>{row.name}</code>
                {row.required && <span className="ml-2 text-xs px-1 py-0.5 rounded" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>required</span>}
              </td>
              <td className="px-4 py-3" style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>{row.type}</td>
              <td className="px-4 py-3" style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Token generator ────────────────────────────────────────────────────────────

function TokenGenerator() {
  const { token, loading } = useToken()
  const [revealed, setRevealed] = useState(false)

  if (loading) {
    return (
      <div className="rounded-lg p-4" style={{ border: '1px solid #e5e5e5', background: '#fafafa' }}>
        <div className="h-4 rounded" style={{ background: '#e5e5e5', width: '40%' }} />
      </div>
    )
  }

  if (!token) {
    return (
      <div className="rounded-lg p-4" style={{ border: '1px solid #e5e5e5', background: '#fafafa' }}>
        <div className="flex items-center gap-2 mb-2">
          <Key size={13} style={{ color: '#888' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your API Token</span>
        </div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
          Zaloguj się do Magic Diary, żeby wygenerować swój token API.
        </p>
        <a href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors"
          style={{ background: '#111', color: '#fff', fontSize: 12, textDecoration: 'none' }}>
          Zaloguj się <ExternalLink size={11} />
        </a>
      </div>
    )
  }

  const masked = token.slice(0, 14) + '•'.repeat(18) + token.slice(-6)

  return (
    <div className="rounded-lg p-4" style={{ border: '1px solid #d1d5db', background: '#fff' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Key size={13} style={{ color: '#111' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#111', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your API Token</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setRevealed(r => !r)}
            style={{ fontSize: 12, color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>
            {revealed ? 'Hide' : 'Reveal'}
          </button>
          <CopyButton text={token} />
        </div>
      </div>
      <code className="block w-full text-sm break-all p-2 rounded" suppressHydrationWarning
        style={{ fontFamily: 'monospace', fontSize: 12, background: '#f9fafb', border: '1px solid #f0f0f0', color: revealed ? '#111' : '#999' }}>
        {revealed ? token : masked}
      </code>
      <p style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
        Token ważny do końca sesji. Odśwież stronę, żeby odświeżyć.
      </p>
    </div>
  )
}

// ── Section content ────────────────────────────────────────────────────────────

function CreateSection({ tab, baseUrl }: { tab: Tab; baseUrl: string }) {
  if (tab === 'api') return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MethodBadge method="POST" />
        <code style={{ fontFamily: 'monospace', fontSize: 14, color: '#111' }}>/api/v1/entries</code>
      </div>
      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 20 }}>
        Tworzy nowy wpis w Magic Diary. Domyślnie przypisany do dzisiejszego dnia.
      </p>
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Request body</h4>
      <ParamTable rows={[
        { name: 'title', type: 'string', desc: 'Tytuł wpisu' },
        { name: 'content', type: 'string', desc: 'Treść wpisu — plain text lub HTML' },
        { name: 'mood', type: 'integer 1–5', desc: '1=Koszmarnie 2=Źle 3=Neutralnie 4=Dobrze 5=Świetnie' },
        { name: 'date', type: 'string', desc: 'Format YYYY-MM-DD (domyślnie dziś)' },
      ]} />
      <CodeBlock language="curl" code={`curl -X POST ${baseUrl}/api/v1/entries \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Dzisiejszy dzień w Hogwarcie",
    "content": "Potions była dziś wyjątkowo trudna...",
    "mood": 3
  }'`} />
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 8px' }}>Response — 201 Created</h4>
      <CodeBlock language="json" code={`{
  "id": "abc123xyz",
  "title": "Dzisiejszy dzień w Hogwarcie",
  "content": "Potions była dziś wyjątkowo trudna...",
  "mood": 3,
  "date": "2026-06-04",
  "createdAt": "2026-06-04T14:23:00Z",
  "updatedAt": "2026-06-04T14:23:00Z"
}`} />
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ToolBadge />
        <code style={{ fontFamily: 'monospace', fontSize: 14, color: '#111' }}>add_diary_entry</code>
      </div>
      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 20 }}>
        Tworzy nowy wpis w Magic Diary. Domyślnie na dzisiaj.
      </p>
      <CodeBlock language="json — MCP call" code={`{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "add_diary_entry",
    "arguments": {
      "title": "Dzisiejszy dzień w Hogwarcie",
      "content": "Potions była dziś wyjątkowo trudna...",
      "mood": 3,
      "date": "2026-06-04"
    }
  }
}`} />
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 8px' }}>Claude Desktop config</h4>
      <CodeBlock language="claude_desktop_config.json" code={`{
  "mcpServers": {
    "magic-diary": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${baseUrl}/api/mcp", "--header", "Authorization: Bearer YOUR_TOKEN"]
    }
  }
}`} />
    </div>
  )
}

function AskSection({ tab, baseUrl }: { tab: Tab; baseUrl: string }) {
  if (tab === 'api') return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MethodBadge method="POST" />
        <code style={{ fontFamily: 'monospace', fontSize: 14, color: '#111' }}>/api/v1/ask</code>
      </div>
      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 20 }}>
        Wysyła wiadomość do nauczyciela AI (obecnie Severus Snape) — odpowiedź ucznia na jego pytanie lub nową refleksję z dziennika. Opcjonalnie można przekazać datę wpisu jako kontekst.
      </p>
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Request body</h4>
      <ParamTable rows={[
        { name: 'message', type: 'string', required: true, desc: 'Wiadomość ucznia — odpowiedź na pytanie nauczyciela lub nowa refleksja' },
        { name: 'date', type: 'string', desc: 'Format YYYY-MM-DD — ładuje wpis jako kontekst rozmowy' },
      ]} />
      <CodeBlock language="curl" code={`curl -X POST ${baseUrl}/api/v1/ask \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Odkładam rozmowy, bo boję się że nie będę umiał się obronić.",
    "date": "2026-06-04"
  }'`} />
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 8px' }}>Response — 200 OK</h4>
      <CodeBlock language="json" code={`{
  "answer": "Obronić... przed kim konkretnie? Strach przed brakiem argumentów to rzadko strach przed rozmową — to strach przed tym, że ktoś zobaczy, że masz rację i tak jej nie broni."
}`} />
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ToolBadge />
        <code style={{ fontFamily: 'monospace', fontSize: 14, color: '#111' }}>ask_snape</code>
      </div>
      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 20 }}>
        Wysyła wiadomość do nauczyciela AI — odpowiedź ucznia lub nową refleksję. Nauczyciel może przeszukać historię wpisów i odpowie w swoim charakterystycznym stylu.
      </p>
      <CodeBlock language="json — MCP call" code={`{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "ask_snape",
    "arguments": {
      "message": "Odkładam rozmowy, bo boję się że nie będę umiał się obronić.",
      "date": "2026-06-04"
    }
  }
}`} />
    </div>
  )
}

function ReadSection({ tab, baseUrl }: { tab: Tab; baseUrl: string }) {
  if (tab === 'api') return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MethodBadge method="GET" />
        <code style={{ fontFamily: 'monospace', fontSize: 14, color: '#111' }}>/api/v1/entries/:date</code>
      </div>
      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 20 }}>
        Pobiera wpis z dziennika dla wskazanego dnia. Jeśli danego dnia jest kilka wpisów, zwracany jest najnowszy.
      </p>
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>URL params</h4>
      <ParamTable rows={[
        { name: ':date', type: 'string', required: true, desc: 'Format YYYY-MM-DD' },
      ]} />
      <CodeBlock language="curl" code={`curl ${baseUrl}/api/v1/entries/2026-06-04 \\
  -H "Authorization: Bearer YOUR_TOKEN"`} />
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 8px' }}>Response — 200 OK</h4>
      <CodeBlock language="json" code={`{
  "id": "abc123xyz",
  "title": "Dzisiejszy dzień w Hogwarcie",
  "content": "<p>Potions była dziś wyjątkowo trudna...</p>",
  "mood": 3,
  "date": "2026-06-04",
  "createdAt": "2026-06-04T14:23:00Z",
  "updatedAt": "2026-06-04T14:23:00Z"
}`} />
      <CodeBlock language="json — 404" code={`{ "error": "Brak wpisu na ten dzień" }`} />
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ToolBadge />
        <code style={{ fontFamily: 'monospace', fontSize: 14, color: '#111' }}>get_diary_entry</code>
      </div>
      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 20 }}>
        Pobiera wpis z Magic Diary dla wskazanego dnia. Zwraca treść w czystym tekście (bez HTML).
      </p>
      <CodeBlock language="json — MCP call" code={`{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_diary_entry",
    "arguments": { "date": "2026-06-04" }
  }
}`} />
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#111', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 8px' }}>Claude Desktop setup</h4>
      <CodeBlock language="claude_desktop_config.json" code={`{
  "mcpServers": {
    "magic-diary": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${baseUrl}/api/mcp", "--header", "Authorization: Bearer YOUR_TOKEN"]
    }
  }
}`} />
    </div>
  )
}

// ── Nav ────────────────────────────────────────────────────────────────────────

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'create', label: 'Create entry', icon: <Plus size={13} /> },
  { id: 'ask', label: 'Reply to teacher', icon: <MessageSquare size={13} /> },
  { id: 'read', label: 'Read entry', icon: <Search size={13} /> },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [tab, setTab] = useState<Tab>('api')
  const [section, setSection] = useState<Section>('create')
  const [baseUrl, setBaseUrl] = useState('https://your-app.vercel.app')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setBaseUrl(window.location.origin)
    setMounted(true)
  }, [])

  if (!mounted) return <div style={{ background: '#fff', minHeight: '100vh' }} />

  return (
    <div style={{ background: '#fff', color: '#111', minHeight: '100vh', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #e5e5e5', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', zIndex: 50 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <Wand2 size={16} style={{ color: '#111' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Magic Diary</span>
            </a>
            <span style={{ color: '#d1d5db', fontSize: 18 }}>/</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={13} style={{ color: '#666' }} />
              <span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>Docs</span>
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', background: '#f4f4f5', borderRadius: 8, padding: 3, gap: 2 }}>
            {(['api', 'mcp'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '4px 14px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  background: tab === t ? '#fff' : 'transparent',
                  color: tab === t ? '#111' : '#888',
                  boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px', display: 'flex', gap: 40 }}>

        {/* Sidebar */}
        <aside style={{ width: 200, flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 80 }}>
            {/* Token */}
            <TokenGenerator />

            <div style={{ marginTop: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {tab === 'api' ? 'Endpoints' : 'Tools'}
              </p>
              <nav>
                {NAV.map(item => (
                  <button key={item.id} onClick={() => setSection(item.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: section === item.id ? '#f4f4f5' : 'transparent',
                      color: section === item.id ? '#111' : '#555',
                      fontSize: 13,
                      fontWeight: section === item.id ? 500 : 400,
                      marginBottom: 2,
                      transition: 'all 0.1s',
                    }}>
                    <span style={{ color: section === item.id ? '#111' : '#aaa' }}>{item.icon}</span>
                    {item.label}
                    {section === item.id && <ChevronRight size={11} style={{ marginLeft: 'auto', color: '#888' }} />}
                  </button>
                ))}
              </nav>
            </div>

            {tab === 'mcp' && (
              <div style={{ marginTop: 24, padding: '12px', borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e5e5' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Endpoint</p>
                <code style={{ fontFamily: 'monospace', fontSize: 11, color: '#555', wordBreak: 'break-all' }}>POST /api/mcp</code>
              </div>
            )}
          </div>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Overview */}
          {tab === 'api' && (
            <div style={{ marginBottom: 32, paddingBottom: 28, borderBottom: '1px solid #f0f0f0' }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 8 }}>Magic Diary REST API</h1>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 14 }}>
                Publiczne API umożliwia każdemu agentowi AI lub aplikacji tworzenie wpisów, komunikację z nauczycielem i odczytywanie dziennika — pod warunkiem posiadania tokenu.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Base URL</span>
                <code suppressHydrationWarning style={{ fontFamily: 'monospace', fontSize: 12, color: '#111', background: '#f4f4f5', padding: '2px 8px', borderRadius: 4 }}>{baseUrl}/api/v1</code>
                <CopyButton text={`${baseUrl}/api/v1`} />
              </div>
            </div>
          )}

          {tab === 'mcp' && (
            <div style={{ marginBottom: 32, paddingBottom: 28, borderBottom: '1px solid #f0f0f0' }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 8 }}>Magic Diary MCP Server</h1>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 14 }}>
                Serwer MCP (Model Context Protocol) umożliwia agentom AI — takim jak Claude Desktop — bezpośredni dostęp do Magic Diary przez JSON-RPC 2.0. Trzy narzędzia: dodaj wpis, odpowiedz nauczycielowi, odczytaj wpis.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Endpoint</span>
                <code suppressHydrationWarning style={{ fontFamily: 'monospace', fontSize: 12, color: '#111', background: '#f4f4f5', padding: '2px 8px', borderRadius: 4 }}>{baseUrl}/api/mcp</code>
                <CopyButton text={`${baseUrl}/api/mcp`} />
              </div>
            </div>
          )}

          {/* Section content */}
          <div>
            {section === 'create' && <CreateSection tab={tab} baseUrl={baseUrl} />}
            {section === 'ask' && <AskSection tab={tab} baseUrl={baseUrl} />}
            {section === 'read' && <ReadSection tab={tab} baseUrl={baseUrl} />}
          </div>

          {/* Auth */}
          <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid #f0f0f0' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 8 }}>Authentication</h2>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 4 }}>
              Wszystkie endpointy wymagają tokenu w nagłówku <code style={{ fontFamily: 'monospace', fontSize: 13, background: '#f4f4f5', padding: '1px 5px', borderRadius: 3 }}>Authorization</code>:
            </p>
            <CodeBlock language="http" code={`Authorization: Bearer YOUR_TOKEN`} />
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
              Token generujesz powyżej po zalogowaniu. Każdy token jest przypisany do konkretnego użytkownika — dane chronione przez Supabase Row Level Security.
            </p>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e5e5e5', marginTop: 48 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wand2 size={13} style={{ color: '#aaa' }} />
            <span style={{ fontSize: 12, color: '#aaa' }}>Magic Diary</span>
          </div>
          <a href="/" style={{ fontSize: 12, color: '#666', textDecoration: 'none' }}>← Wróć do aplikacji</a>
        </div>
      </footer>
    </div>
  )
}
