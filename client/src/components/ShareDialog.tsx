/**
 * MirageAPI - OpenAPI Mock Server
 * Copyright (c) 2024 Satya Bandaru. All rights reserved.
 * Licensed under the MIT License. See LICENSE file for details.
 */

import React, { useEffect, useState } from 'react'
import { ParsedRoute } from '../types/api'
import Icon from './Icon'

interface ShareInfo {
  id: string
  url: string
  endpoints: number
  updatedAt: string
  expiresAt: string
}

interface ShareDialogProps {
  routes: ParsedRoute[]
  accentColor: string
  onClose: () => void
}

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border2)',
  background: 'var(--surface2)',
  color: 'var(--text2)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--display)'
}

const codeStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '9px 12px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border2)',
  background: 'var(--surface2)',
  fontFamily: 'var(--mono)',
  fontSize: 12,
  color: 'var(--text)',
  overflowX: 'auto',
  whiteSpace: 'nowrap'
}

// Public link to this session's mock: mirageapi.com/m/<id>/...
const ShareDialog: React.FC<ShareDialogProps> = ({ routes, accentColor, onClose }) => {
  const [share, setShare] = useState<ShareInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/share')
      .then(res => res.json())
      .then(data => setShare(data.share))
      .catch(() => setError('Could not load the share status'))
      .finally(() => setLoading(false))
  }, [])

  // Creates the link, or updates it with the current spec (same URL)
  const saveShare = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/share', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not share this spec')
      setShare(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share this spec')
    } finally {
      setLoading(false)
    }
  }

  const stopSharing = async () => {
    setLoading(true)
    setError(null)
    try {
      await fetch('/api/share', { method: 'DELETE' })
      setShare(null)
    } catch {
      setError('Could not stop sharing')
    } finally {
      setLoading(false)
    }
  }

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // navigator.clipboard only exists on secure origins (https, localhost)
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  // A GET route without path parameters makes the best copy-paste example
  const exampleRoute = routes.find(r => r.method === 'GET' && !r.path.includes('{')) ||
    routes.find(r => r.method === 'GET') || routes[0]
  const exampleCurl = share && exampleRoute ? `curl ${share.url}${exampleRoute.path}` : ''

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000
      }}
    >
      <div
        role="dialog"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius2)',
          padding: 24,
          width: '90%',
          maxWidth: 580
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 id="share-title" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--display)', margin: 0 }}>
            Share this mock
          </h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>
            ×
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 16px', lineHeight: 1.5 }}>
          A public link that anyone, a frontend app or a CI job can call. No browser session needed.
        </p>

        {loading && !share && (
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Loading…</div>
        )}

        {!loading && !share && (
          <button
            onClick={saveShare}
            style={{ ...buttonStyle, border: `1px solid ${accentColor}40`, background: accentColor + '20', color: accentColor }}
          >
            <Icon name="Share2" size={13} strokeWidth={2} />
            Create share link
          </button>
        )}

        {share && (
          <>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontFamily: 'var(--display)' }}>Base URL</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <code style={codeStyle}>{share.url}</code>
              <button onClick={() => copy(share.url, 'url')} style={buttonStyle}>
                <Icon name={copied === 'url' ? 'Check' : 'Copy'} size={12} strokeWidth={2} />
                {copied === 'url' ? 'Copied' : 'Copy'}
              </button>
            </div>

            {exampleCurl && (
              <>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontFamily: 'var(--display)' }}>Try it</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <code style={codeStyle}>{exampleCurl}</code>
                  <button onClick={() => copy(exampleCurl, 'curl')} style={buttonStyle}>
                    <Icon name={copied === 'curl' ? 'Check' : 'Copy'} size={12} strokeWidth={2} />
                  </button>
                </div>
              </>
            )}

            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 16px', lineHeight: 1.5 }}>
              {share.endpoints} endpoints · expires {new Date(share.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}.
              Edited the spec? Click <strong>Update link</strong> to publish the changes at the same URL.
              Links are reset if the MirageAPI server restarts.
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={stopSharing} disabled={loading} style={{ ...buttonStyle, color: 'var(--red)' }}>
                Stop sharing
              </button>
              <button
                onClick={saveShare}
                disabled={loading}
                style={{ ...buttonStyle, border: `1px solid ${accentColor}40`, background: accentColor + '20', color: accentColor }}
              >
                <Icon name="RefreshCw" size={12} strokeWidth={2} />
                Update link
              </button>
            </div>
          </>
        )}

        {error && (
          <div role="alert" style={{
            marginTop: 14,
            padding: '8px 12px',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(224,62,53,0.3)',
            background: 'rgba(224,62,53,0.08)',
            color: 'var(--red)',
            fontSize: 12
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default ShareDialog
