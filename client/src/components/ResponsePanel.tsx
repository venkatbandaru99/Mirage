import React, { useState } from 'react'
import { ParsedRoute } from '../types/api'
import Icon from './Icon'

interface ResponseData {
  status: number
  body: any
  ms: number
  ts: number
}

interface ResponsePanelProps {
  selectedEndpoint: ParsedRoute | null
  onTryEndpoint: (endpoint: ParsedRoute) => void
  response: ResponseData | null
  loading: boolean
  accentColor: string
}

// JSON syntax highlighter
const highlightJson = (json: string) => {
  if (!json) return ''
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-num'
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-str'
        } else if (/true|false/.test(match)) {
          cls = 'json-bool'
        } else if (/null/.test(match)) {
          cls = 'json-null'
        }
        return `<span class="${cls}">${match}</span>`
      }
    )
}

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const METHOD_COLORS = {
    GET: { bg: 'rgba(47,127,212,0.10)', text: '#2F7FD4', border: 'rgba(47,127,212,0.25)' },
    POST: { bg: 'rgba(24,168,107,0.10)', text: '#18A86B', border: 'rgba(24,168,107,0.25)' },
    PUT: { bg: 'rgba(217,119,6,0.10)', text: '#B45309', border: 'rgba(217,119,6,0.25)' },
    DELETE: { bg: 'rgba(224,62,53,0.10)', text: '#E03E35', border: 'rgba(224,62,53,0.25)' },
    PATCH: { bg: 'rgba(124,92,232,0.10)', text: '#7C5CE8', border: 'rgba(124,92,232,0.25)' },
  }
  
  const c = METHOD_COLORS[method as keyof typeof METHOD_COLORS] || METHOD_COLORS.GET
  
  return (
    <span style={{
      display: 'inline-block',
      minWidth: 54,
      textAlign: 'center',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.06em',
      fontFamily: 'var(--mono)',
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`
    }}>
      {method}
    </span>
  )
}

const ResponsePanel: React.FC<ResponsePanelProps> = ({
  selectedEndpoint,
  onTryEndpoint,
  response,
  loading,
  accentColor
}) => {
  const [copied, setCopied] = useState(false)

  const copyResponse = () => {
    if (!response?.body) return
    
    const responseText = JSON.stringify(response.body, null, 2)
    navigator.clipboard.writeText(responseText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const regenerateResponse = () => {
    if (selectedEndpoint) {
      onTryEndpoint(selectedEndpoint)
    }
  }

  if (!selectedEndpoint) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        color: 'var(--text3)'
      }}>
        <Icon name="MousePointerClick" size={28} strokeWidth={1} />
        <span style={{ fontSize: 12 }}>Select an endpoint to preview a response</span>
      </div>
    )
  }

  const bodyStr = response?.body != null ? JSON.stringify(response.body, null, 2) : ''

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Response header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <MethodBadge method={selectedEndpoint.method} />
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--text)',
            fontWeight: 500
          }}>
            {selectedEndpoint.path}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!loading && !response && (
            <button
              onClick={() => onTryEndpoint(selectedEndpoint)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius)',
                border: `1px solid ${accentColor}40`,
                background: accentColor + '18',
                color: accentColor,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--display)',
                letterSpacing: '0.01em'
              }}
            >
              <Icon name="Play" size={12} strokeWidth={2} />
              Test Endpoint
            </button>
          )}
          
          {response && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="Clock" size={11} color="var(--text3)" strokeWidth={1.5} />
                <span style={{
                  fontSize: 11,
                  fontFamily: 'var(--mono)',
                  color: 'var(--text3)'
                }}>
                  {response.ms}ms
                </span>
              </div>
              
              <div style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'var(--mono)',
                background: response.status < 300 ? 'rgba(24,168,107,0.1)' : response.status < 400 ? 'rgba(245,166,35,0.1)' : 'rgba(240,88,77,0.1)',
                color: response.status < 300 ? '#18A86B' : response.status < 400 ? '#B45309' : '#E03E35',
                border: `1px solid ${response.status < 300 ? 'rgba(24,168,107,0.25)' : response.status < 400 ? 'rgba(245,166,35,0.25)' : 'rgba(240,88,77,0.25)'}`,
                letterSpacing: '0.02em'
              }}>
                {response.status}
              </div>
              
              <button
                onClick={copyResponse}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${copied ? 'rgba(24,168,107,0.3)' : 'var(--border2)'}`,
                  background: copied ? 'rgba(24,168,107,0.1)' : 'transparent',
                  color: copied ? '#18A86B' : 'var(--text3)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--display)'
                }}
              >
                {copied ? <Icon name="Check" size={11} strokeWidth={2} /> : <Icon name="Copy" size={11} strokeWidth={1.5} />}
              </button>
              
              <button
                onClick={regenerateResponse}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border2)',
                  background: 'transparent',
                  color: 'var(--text3)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--display)'
                }}
              >
                <Icon name="RefreshCw" size={11} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* JSON body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '120px',
            flexDirection: 'column',
            gap: 12,
            color: 'var(--text3)',
            fontSize: 12
          }}>
            <Icon name="Loader" size={18} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontFamily: 'var(--display)', fontWeight: 500 }}>Fetching response…</span>
          </div>
        ) : response?.body != null ? (
          <pre
            key={response.ts}
            className="response-fade"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              lineHeight: 1.65,
              color: 'var(--text2)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}
            dangerouslySetInnerHTML={{ __html: highlightJson(bodyStr) }}
          />
        ) : response && response.body === null ? (
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--text3)'
          }}>
            {response.status} No Content
          </span>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            flexDirection: 'column',
            gap: 12,
            color: 'var(--text3)'
          }}>
            <Icon name="Play" size={28} strokeWidth={1} />
            <span style={{ fontSize: 12, fontFamily: 'var(--display)', fontWeight: 500 }}>Click "Test Endpoint" to see a response</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResponsePanel