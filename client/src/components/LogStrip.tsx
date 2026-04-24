import React, { useRef, useEffect, useState } from 'react'
import Icon from './Icon'

export interface LogEntry {
  id: number
  time: string
  method: string
  path: string
  status: number
  ms: number
}

interface LogStripProps {
  logs: LogEntry[]
  open: boolean
  onToggle: () => void
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

const LogStrip: React.FC<LogStripProps> = ({ logs, open, onToggle }) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bottomRef.current && open) {
      bottomRef.current.scrollTop = bottomRef.current.scrollHeight
    }
  }, [logs, open])

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      flexShrink: 0,
      transition: 'height 0.2s ease',
      height: open ? 130 : 32,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Toggle bar */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'space-between',
          padding: '0 16px',
          height: 32,
          background: 'transparent',
          border: 'none',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          cursor: 'pointer',
          width: '100%',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: logs.length > 0 ? '#F5A623' : 'var(--text3)',
            animation: logs.length > 0 ? 'pulse-amber 2s infinite' : 'none',
            boxShadow: logs.length > 0 ? '0 0 8px rgba(245,166,35,0.3)' : 'none',
            transition: 'all 0.3s ease'
          }} />
          <span style={{
            fontSize: 11,
            fontFamily: 'var(--display)',
            color: 'var(--text2)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Server Logs
          </span>
          <span style={{
            fontSize: 10,
            fontFamily: 'var(--mono)',
            color: 'var(--text3)',
            background: 'var(--surface3)',
            padding: '2px 6px',
            borderRadius: 8,
            border: '1px solid var(--border)'
          }}>
            {logs.length > 0 ? `${logs.length} request${logs.length !== 1 ? 's' : ''}` : 'idle'}
          </span>
        </div>
        {open ? 
          <Icon name="ChevronDown" size={12} strokeWidth={2} color="var(--text3)" /> : 
          <Icon name="ChevronUp" size={12} strokeWidth={2} color="var(--text3)" />
        }
      </button>

      {/* Log entries */}
      {open && (
        <div 
          ref={bottomRef} 
          style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '6px 16px' 
          }}
        >
          {logs.length === 0 ? (
            <div style={{
              fontSize: 11,
              fontFamily: 'var(--mono)',
              color: 'var(--text3)',
              paddingTop: 4
            }}>
              Waiting for requests…
            </div>
          ) : (
            logs.map((log, i) => {
              const LogRow = ({ children }: { children: React.ReactNode }) => {
                const [hovered, setHovered] = useState(false)
                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      fontSize: 11,
                      fontFamily: 'var(--mono)',
                      color: 'var(--text3)',
                      padding: '4px 8px',
                      marginBottom: 1,
                      borderRadius: 4,
                      borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'all 0.15s ease',
                      animation: `log-slide-in 0.3s ease-out ${i * 50}ms backwards`,
                      cursor: 'default',
                      background: hovered ? 'var(--surface2)' : 'transparent',
                      borderColor: hovered ? 'var(--border2)' : 'var(--border)'
                    }}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                  >
                    {children}
                  </div>
                )
              }
              
              return (
                <LogRow key={log.id}>
                  <span style={{ color: 'var(--text3)', minWidth: 72, fontSize: 10 }}>{log.time}</span>
                  <MethodBadge method={log.method} />
                  <span style={{ color: 'var(--text2)', flex: 1, fontWeight: 500 }}>{log.path}</span>
                  <span style={{
                    color: log.status < 300 ? '#18A86B' : log.status < 400 ? '#B45309' : '#E03E35',
                    minWidth: 32,
                    fontWeight: 600,
                    fontSize: 10,
                    background: log.status < 300 ? 'rgba(24,168,107,0.1)' : log.status < 400 ? 'rgba(245,166,35,0.1)' : 'rgba(240,88,77,0.1)',
                    padding: '2px 6px',
                    borderRadius: 3,
                    textAlign: 'center'
                  }}>
                    {log.status}
                  </span>
                  <span style={{
                    color: 'var(--text3)',
                    minWidth: 50,
                    textAlign: 'right',
                    fontSize: 10
                  }}>
                    {log.ms}ms
                  </span>
                </LogRow>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default LogStrip