import React, { useState } from 'react'
import Icon from './Icon'

interface HeaderProps {
  serverRunning: boolean
  port: number
  onToggleServer: () => void
  accentColor: string
  sessionId?: string
}

const Header: React.FC<HeaderProps> = ({ serverRunning, port, onToggleServer, accentColor, sessionId }) => {
  const [hovered, setHovered] = useState(false)

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: 56,
      borderBottom: '1px solid var(--border)',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(244,245,247,0.9) 100%)',
      backdropFilter: 'blur(12px)',
      flexShrink: 0
    }}>
      {/* Left: wordmark */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{
          fontFamily: 'var(--display)',
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: '-0.03em',
          color: 'var(--text)'
        }}>
          <span style={{ color: accentColor }}>Mi</span>rage<span style={{ color: accentColor }}>API</span>
        </span>
        <span style={{
          fontSize: 11,
          color: 'var(--text3)',
          fontWeight: 400,
          letterSpacing: '0.01em',
          paddingLeft: 2
        }}>
          Spin up mock APIs from spec. Instantly.
        </span>
      </div>

      {/* Right: status + controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Session indicator */}
        {sessionId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11,
              color: 'var(--text3)',
              fontFamily: 'var(--mono)',
              background: 'var(--bg2)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border2)'
            }}>
              Session: {sessionId.slice(-6)}
            </span>
          </div>
        )}

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: serverRunning ? 'var(--green)' : 'var(--text3)',
            animation: serverRunning ? 'pulse-dot 2s ease infinite' : 'none'
          }} />
          <span style={{
            fontSize: 12,
            color: serverRunning ? 'var(--text)' : 'var(--text3)',
            fontFamily: 'var(--mono)'
          }}>
            {serverRunning ? `localhost:${port}` : 'offline'}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--border2)' }} />

        {/* Start/Stop button */}
        <button
          onClick={onToggleServer}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 16px',
            borderRadius: 'var(--radius)',
            border: `1px solid ${serverRunning ? 'rgba(240,88,77,0.4)' : accentColor + '80'}`,
            background: serverRunning
              ? hovered ? 'rgba(240,88,77,0.15)' : 'rgba(240,88,77,0.08)'
              : hovered ? accentColor + '22' : accentColor + '12',
            color: serverRunning ? 'var(--red)' : accentColor,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'var(--display)',
            letterSpacing: '0.01em'
          }}
        >
          {serverRunning ? (
            <>
              <Icon name="Square" size={13} strokeWidth={2.5} style={{ marginTop: 0 }} />
              Stop Server
            </>
          ) : (
            <>
              <Icon name="Play" size={13} strokeWidth={2.5} style={{ marginTop: 0 }} />
              Start Server
            </>
          )}
        </button>
      </div>
    </header>
  )
}

export default Header