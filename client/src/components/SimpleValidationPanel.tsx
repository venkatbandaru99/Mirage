import React, { useState } from 'react'

interface ValidationPanelProps {
  validation: any
  onRevalidate?: () => void
  onHide?: () => void
}

const SimpleValidationPanel: React.FC<ValidationPanelProps> = ({ validation, onRevalidate, onHide }) => {
  const [filter, setFilter] = useState<'errors' | 'warnings' | 'suggestions' | null>(null)

  if (!validation) return null

  const { summary, issues } = validation
  const errors = issues.filter((i: any) => i.severity === 'error')
  const warnings = issues.filter((i: any) => i.severity === 'warning')
  const suggestions = issues.filter((i: any) => i.severity === 'suggestion')

  const score = validation.qualityScore
  const scoreColor = '#a78bfa'

  const checks = {
    passed: summary.passedChecks || 0,
    total: summary.totalChecks || 0
  }

  // Get filtered items based on current filter
  const items = filter === 'errors' ? errors :
               filter === 'warnings' ? warnings :
               filter === 'suggestions' ? suggestions : []

  return (
    <div style={{
      flexShrink: 0,
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface2)'
    }}>
      <div style={{ padding: '10px 20px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px'
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.01em'
          }}>
            Spec Validation
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onRevalidate && (
              <button
                onClick={onRevalidate}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text3)',
                  fontSize: 11,
                  fontFamily: 'var(--display)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                🔄 Re-check
              </button>
            )}
            {onHide && (
              <button
                onClick={onHide}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text3)',
                  fontSize: 11,
                  fontFamily: 'var(--display)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                ↑ Hide
              </button>
            )}
          </div>
        </div>

        {/* Quality Score + Stats Row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', marginBottom: 10 }}>
          {/* Compact Quality Score Card */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '8px 12px',
            minWidth: 100
          }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>
              Quality Score
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
              {score}<span style={{ fontSize: 12, fontWeight: 400 }}>%</span>
            </div>
            <div style={{
              marginTop: 5,
              width: '100%',
              height: 3,
              background: 'var(--surface3)',
              borderRadius: 2,
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${score}%`,
                height: '100%',
                background: scoreColor,
                transition: 'width 0.8s'
              }} />
            </div>
          </div>

          {/* Stats Chips */}
          {[
            { label: 'Errors', count: errors.length, hex: '#E03E35', key: 'errors' as const },
            { label: 'Warnings', count: warnings.length, hex: '#D97706', key: 'warnings' as const },
            { label: 'Suggestions', count: suggestions.length, hex: '#2F7FD4', key: 'suggestions' as const },
            { label: 'Checks', count: `${checks.passed}/${checks.total}`, hex: '#4A5068', key: null }
          ].map(({ label, count, hex, key }) => (
            <div
              key={label}
              onClick={() => key && count && setFilter(filter === key ? null : key)}
              style={{
                flex: 1,
                textAlign: 'center',
                background: filter === key ? hex + '18' : 'var(--surface)',
                border: `1px solid ${filter === key ? hex + '66' : 'var(--border)'}`,
                borderRadius: 6,
                padding: '6px 4px',
                cursor: key && count ? 'pointer' : 'default',
                opacity: key && !count ? 0.35 : 1,
                transition: 'all 0.15s',
                userSelect: 'none'
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: hex, lineHeight: 1.2 }}>
                {count}
              </div>
              <div style={{
                fontSize: 9,
                color: 'var(--text3)',
                letterSpacing: '0.06em',
                marginTop: 2
              }}>
                {label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        {/* Filtered Issues List */}
        {items.length > 0 && (
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 6,
            maxHeight: 80,
            overflow: 'auto'
          }}>
            {items.map((item: any, i: number) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '3px 0',
                  borderBottom: i < items.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none'
                }}
              >
                {filter === 'errors' && <span style={{ color: 'var(--red)', fontSize: 11 }}>⚠</span>}
                {filter === 'warnings' && <span style={{ color: 'var(--amber)', fontSize: 11 }}>△</span>}
                {filter === 'suggestions' && <span style={{ color: 'var(--blue)', fontSize: 11 }}>💡</span>}
                <span style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--text3)',
                  minWidth: 160
                }}>
                  {item.path || 'spec'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1 }}>
                  {item.message}
                </span>
                {item.lineNumber && (
                  <span style={{
                    fontSize: 9,
                    color: 'var(--text3)',
                    background: 'var(--surface3)',
                    padding: '1px 4px',
                    borderRadius: 2
                  }}>
                    L{item.lineNumber}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Issues Message */}
        {summary.totalIssues === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '16px',
            color: 'var(--text3)',
            fontSize: '11px'
          }}>
            🎉 No issues found! Your OpenAPI spec looks great.
          </div>
        )}
      </div>
    </div>
  )
}

export default SimpleValidationPanel