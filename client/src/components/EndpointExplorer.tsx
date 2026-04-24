import React, { useState } from 'react'
import { ParsedRoute } from '../types/api'
import Icon from './Icon'

interface EndpointExplorerProps {
  routes: ParsedRoute[]
  selectedEndpoint: ParsedRoute | null
  onSelectEndpoint: (endpoint: ParsedRoute) => void
  onTryEndpoint: (endpoint: ParsedRoute) => void
}

const METHOD_COLORS = {
  GET: { bg: 'rgba(47,127,212,0.10)', text: '#2F7FD4', border: 'rgba(47,127,212,0.25)' },
  POST: { bg: 'rgba(24,168,107,0.10)', text: '#18A86B', border: 'rgba(24,168,107,0.25)' },
  PUT: { bg: 'rgba(217,119,6,0.10)', text: '#B45309', border: 'rgba(217,119,6,0.25)' },
  DELETE: { bg: 'rgba(224,62,53,0.10)', text: '#E03E35', border: 'rgba(224,62,53,0.25)' },
  PATCH: { bg: 'rgba(124,92,232,0.10)', text: '#7C5CE8', border: 'rgba(124,92,232,0.25)' },
}

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
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

const EndpointRow: React.FC<{
  endpoint: ParsedRoute
  idx: number
  selected: ParsedRoute | null
  onSelect: (endpoint: ParsedRoute) => void
  onTry: (endpoint: ParsedRoute) => void
}> = ({ endpoint, idx, selected, onSelect, onTry }) => {
  const [hovered, setHovered] = useState(false)
  const isSelected = selected?.id === endpoint.id

  return (
    <div
      className="endpoint-row"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(endpoint)}
      style={{
        animationDelay: `${idx * 45}ms`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 20px',
        marginBottom: 1,
        cursor: 'pointer',
        background: isSelected
          ? 'rgba(245,166,35,0.1)'
          : hovered ? 'var(--surface2)' : 'transparent',
        borderLeft: `3px solid ${isSelected ? 'var(--amber)' : 'transparent'}`,
        borderRadius: 0,
        transition: 'all 0.15s ease',
        position: 'relative'
      }}
    >
      <MethodBadge method={endpoint.method} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 13,
          color: 'var(--text)',
          letterSpacing: '-0.01em',
          fontWeight: 500,
          marginBottom: 2
        }}>
          {endpoint.path}
        </div>
        {endpoint.summary && (
          <div style={{
            fontSize: 11,
            color: 'var(--text3)',
            fontFamily: 'var(--display)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {endpoint.summary}
          </div>
        )}
      </div>
      {(hovered || isSelected) && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTry(endpoint)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 4,
            border: '1px solid rgba(245,166,35,0.3)',
            background: 'rgba(245,166,35,0.1)',
            color: 'var(--amber)',
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--display)',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap'
          }}
        >
          <Icon name="Play" size={9} strokeWidth={2.5} />
          TRY
        </button>
      )}
    </div>
  )
}

const EndpointGroup: React.FC<{
  name: string
  endpoints: ParsedRoute[]
  selectedEp: ParsedRoute | null
  onSelect: (endpoint: ParsedRoute) => void
  onTry: (endpoint: ParsedRoute) => void
  baseIdx: number
}> = ({ name, endpoints, selectedEp, onSelect, onTry, baseIdx }) => {
  const [open, setOpen] = useState(true)

  return (
    <div style={{ 
      marginBottom: 8,
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '12px 16px',
          background: 'var(--surface2)',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text2)',
          borderRadius: 0,
          transition: 'all 0.2s ease',
          borderBottom: open ? '1px solid var(--border)' : 'none'
        }}
      >
        <div style={{
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          display: 'flex'
        }}>
          <Icon name="ChevronRight" size={14} strokeWidth={2} />
        </div>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontFamily: 'var(--display)',
          flex: 1,
          textAlign: 'left'
        }}>
          {name}
        </span>
        <span style={{
          fontSize: 10,
          color: 'var(--text3)',
          background: 'var(--surface3)',
          padding: '3px 8px',
          borderRadius: 12,
          border: '1px solid var(--border2)',
          fontFamily: 'var(--mono)',
          fontWeight: 600
        }}>
          {endpoints.length}
        </span>
      </button>
      {open && (
        <div style={{ padding: '4px 0' }}>
          {endpoints.map((endpoint, i) => (
            <EndpointRow
              key={endpoint.id}
              endpoint={endpoint}
              idx={baseIdx + i}
              selected={selectedEp}
              onSelect={onSelect}
              onTry={onTry}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const EndpointExplorer: React.FC<EndpointExplorerProps> = ({ 
  routes, 
  selectedEndpoint, 
  onSelectEndpoint, 
  onTryEndpoint 
}) => {

  // Group endpoints by group field
  const groups = routes.reduce((acc, endpoint) => {
    const groupName = endpoint.group || 'API'
    if (!acc[groupName]) acc[groupName] = []
    acc[groupName].push(endpoint)
    return acc
  }, {} as Record<string, ParsedRoute[]>)

  // Calculate base indices for stagger animation
  let baseIdx = 0
  const groupEntries = Object.entries(groups).map(([name, endpoints]) => {
    const entry = { name, endpoints, baseIdx }
    baseIdx += endpoints.length
    return entry
  })

  return (
    <>
      {groupEntries.map(({ name, endpoints, baseIdx }) => (
        <EndpointGroup
          key={name}
          name={name}
          endpoints={endpoints}
          selectedEp={selectedEndpoint}
          onSelect={onSelectEndpoint}
          onTry={onTryEndpoint}
          baseIdx={baseIdx}
        />
      ))}
    </>
  )
}

export default EndpointExplorer