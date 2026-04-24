import React, { useState } from 'react'

interface ValidationPanelProps {
  validation: any
  onRevalidate?: () => void
}

const IssueDropdown: React.FC<{
  title: string
  count: number
  issues: any[]
  color: string
  bgColor: string
  borderColor: string
  open: boolean
  onToggle: () => void
  limit?: number
}> = ({ title, count, issues, color, bgColor, borderColor, open, onToggle, limit }) => {

  if (count === 0) return null

  const displayIssues = limit ? issues.slice(0, limit) : issues
  const hasMore = limit && issues.length > limit

  return (
    <div style={{
      border: `1px solid ${borderColor}`,
      borderRadius: '6px',
      overflow: 'hidden'
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: bgColor,
          border: 'none',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          color,
          fontFamily: 'var(--display)'
        }}
      >
        <span>{title} ({count})</span>
        <span style={{ 
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          fontSize: '10px'
        }}>
          ▼
        </span>
      </button>

      {open && (
        <div style={{
          background: 'var(--surface)',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {displayIssues.map((issue: any, i: number) => (
            <div
              key={i}
              style={{
                padding: '10px 12px',
                borderBottom: i < displayIssues.length - 1 || hasMore ? `1px solid ${borderColor}` : 'none'
              }}
            >
              <div style={{
                fontSize: '11px',
                fontWeight: 500,
                marginBottom: '4px',
                color: 'var(--text)',
                fontFamily: 'var(--mono)'
              }}>
                {issue.message}
              </div>
              <div style={{
                fontSize: '10px',
                color: 'var(--text3)',
                lineHeight: 1.4,
                fontFamily: 'var(--mono)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>💡 {issue.suggestion}</span>
                {issue.lineNumber && (
                  <span style={{
                    background: color + '20',
                    border: `1px solid ${color}40`,
                    color: color,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '9px',
                    fontWeight: 600,
                    fontFamily: 'var(--mono)'
                  }}>
                    Line {issue.lineNumber}
                  </span>
                )}
              </div>
            </div>
          ))}

          {hasMore && (
            <div style={{
              padding: '8px 12px',
              fontSize: '10px',
              color: 'var(--text3)',
              textAlign: 'center',
              background: 'var(--surface2)'
            }}>
              ... and {issues.length - limit!} more {title.toLowerCase()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SimpleValidationPanel: React.FC<ValidationPanelProps> = ({ validation, onRevalidate }) => {
  const [activeDropdown, setActiveDropdown] = useState<'errors' | 'warnings' | 'suggestions' | null>(null)

  if (!validation) return null

  const { summary, issues } = validation
  const errors = issues.filter((i: any) => i.severity === 'error')
  const warnings = issues.filter((i: any) => i.severity === 'warning')
  const suggestions = issues.filter((i: any) => i.severity === 'suggestion')

  return (
    <div style={{
      padding: '20px 24px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      margin: 0,
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text)',
          fontFamily: 'var(--display)',
          margin: 0
        }}>
          📊 OpenAPI Validation Results
        </h3>
        
        {onRevalidate && (
          <button
            onClick={onRevalidate}
            style={{
              padding: '6px 10px',
              background: 'transparent',
              border: '1px solid var(--border2)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              color: 'var(--text3)'
            }}
          >
            🔄 Re-check
          </button>
        )}
      </div>

      {/* Quality Score */}
      <div style={{
        background: 'linear-gradient(135deg, var(--surface2), var(--surface3))',
        borderRadius: 'var(--radius2)',
        border: '1px solid var(--border2)',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: 3 }}>
            Quality Score
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: '18px',
              fontWeight: 700,
              color: validation.qualityScore >= 70 ? 'var(--green)' : 
                     validation.qualityScore >= 50 ? 'var(--amber)' : 'var(--red)',
              fontFamily: 'var(--display)'
            }}>
              {validation.qualityScore}%
            </span>
            <span style={{
              fontSize: '11px',
              color: 'var(--text3)',
              fontFamily: 'var(--mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {validation.qualityScore >= 90 ? 'Excellent' :
               validation.qualityScore >= 80 ? 'Very Good' :
               validation.qualityScore >= 70 ? 'Good' :
               validation.qualityScore >= 60 ? 'Fair' :
               validation.qualityScore >= 40 ? 'Poor' : 'Needs Work'}
            </span>
          </div>
        </div>
        
        <div style={{
          marginTop: '5px',
          width: '100%',
          height: '3px',
          background: 'var(--surface3)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${validation.qualityScore}%`,
            height: '100%',
            background: validation.qualityScore >= 70 ? 'var(--green)' : 
                       validation.qualityScore >= 50 ? 'var(--amber)' : 'var(--red)',
            transition: 'width 0.8s ease'
          }} />
        </div>
      </div>

      {/* Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <button 
          onClick={() => setActiveDropdown(activeDropdown === 'errors' ? null : 'errors')}
          style={{
            textAlign: 'center',
            background: 'transparent',
            border: '1px solid var(--border2)',
            borderRadius: '6px',
            padding: '8px',
            cursor: summary.errors > 0 ? 'pointer' : 'default',
            opacity: summary.errors > 0 ? 1 : 0.5,
            transition: 'all 0.2s ease'
          }}
          disabled={summary.errors === 0}
        >
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: summary.errors > 0 ? 'var(--red)' : 'var(--green)'
          }}>
            {summary.errors}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text3)' }}>ERRORS</div>
        </button>
        
        <button 
          onClick={() => setActiveDropdown(activeDropdown === 'warnings' ? null : 'warnings')}
          style={{
            textAlign: 'center',
            background: 'transparent',
            border: '1px solid var(--border2)',
            borderRadius: '6px',
            padding: '8px',
            cursor: summary.warnings > 0 ? 'pointer' : 'default',
            opacity: summary.warnings > 0 ? 1 : 0.5,
            transition: 'all 0.2s ease'
          }}
          disabled={summary.warnings === 0}
        >
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: summary.warnings > 0 ? 'var(--amber)' : 'var(--green)'
          }}>
            {summary.warnings}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text3)' }}>WARNINGS</div>
        </button>
        
        <button 
          onClick={() => setActiveDropdown(activeDropdown === 'suggestions' ? null : 'suggestions')}
          style={{
            textAlign: 'center',
            background: 'transparent',
            border: '1px solid var(--border2)',
            borderRadius: '6px',
            padding: '8px',
            cursor: summary.suggestions > 0 ? 'pointer' : 'default',
            opacity: summary.suggestions > 0 ? 1 : 0.5,
            transition: 'all 0.2s ease'
          }}
          disabled={summary.suggestions === 0}
        >
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--blue)'
          }}>
            {summary.suggestions}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text3)' }}>SUGGESTIONS</div>
        </button>
        
        <div style={{ 
          textAlign: 'center',
          border: '1px solid var(--border2)',
          borderRadius: '6px',
          padding: '8px'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text2)'
          }}>
            {summary.passedChecks}/{summary.totalChecks}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text3)' }}>CHECKS</div>
        </div>
      </div>

      {/* Single Conditional Dropdown */}
      {activeDropdown && (
        <div style={{ marginTop: '8px' }}>
          {activeDropdown === 'errors' && (
            <IssueDropdown 
              title="🚨 Errors"
              count={errors.length}
              issues={errors}
              color="var(--red)"
              bgColor="rgba(240, 88, 77, 0.1)"
              borderColor="rgba(240, 88, 77, 0.25)"
              open={true}
              onToggle={() => setActiveDropdown(null)}
            />
          )}

          {activeDropdown === 'warnings' && (
            <IssueDropdown 
              title="⚠️ Warnings"
              count={warnings.length}
              issues={warnings}
              color="var(--amber)"
              bgColor="rgba(245, 166, 35, 0.1)"
              borderColor="rgba(245, 166, 35, 0.25)"
              open={true}
              onToggle={() => setActiveDropdown(null)}
            />
          )}

          {activeDropdown === 'suggestions' && (
            <IssueDropdown 
              title="💡 Suggestions"
              count={suggestions.length}
              issues={suggestions}
              color="var(--blue)"
              bgColor="rgba(47, 127, 212, 0.1)"
              borderColor="rgba(47, 127, 212, 0.25)"
              open={true}
              onToggle={() => setActiveDropdown(null)}
              limit={10}
            />
          )}
        </div>
      )}

      {summary.totalIssues === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: 'var(--text3)',
          fontSize: '12px'
        }}>
          🎉 No issues found! Your OpenAPI spec looks great.
        </div>
      )}
    </div>
  )
}

export default SimpleValidationPanel