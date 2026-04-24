import React, { useState } from 'react'
import Icon from './Icon'

interface ValidationIssue {
  severity: 'error' | 'warning' | 'suggestion'
  code: string
  message: string
  suggestion: string
  lineNumber: number | null
  timestamp: number
}

interface ValidationSummary {
  errors: number
  warnings: number
  suggestions: number
  totalIssues: number
  qualityScore: number
  totalChecks: number
  passedChecks: number
}

interface ValidationResults {
  isValid: boolean
  qualityScore: number
  issues: ValidationIssue[]
  summary: ValidationSummary
}

interface ValidationPanelProps {
  validation: ValidationResults | null
  onRevalidate?: () => void
}

const SeverityIcon: React.FC<{ severity: string }> = ({ severity }) => {
  const iconMap = {
    error: { name: 'AlertCircle', color: 'var(--red)' },
    warning: { name: 'AlertTriangle', color: 'var(--amber)' },
    suggestion: { name: 'Lightbulb', color: 'var(--blue)' }
  }
  
  const config = iconMap[severity as keyof typeof iconMap] || iconMap.suggestion
  
  return <Icon name={config.name} size={14} color={config.color} strokeWidth={1.5} />
}

const QualityScoreBar: React.FC<{ score: number }> = ({ score }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--green)'
    if (score >= 60) return 'var(--amber)'
    return 'var(--red)'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Very Good'
    if (score >= 70) return 'Good'
    if (score >= 60) return 'Fair'
    if (score >= 40) return 'Poor'
    return 'Needs Work'
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      background: 'var(--surface2)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border2)'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text2)',
            fontFamily: 'var(--display)'
          }}>
            Spec Quality Score
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 18,
              fontWeight: 700,
              color: getScoreColor(score),
              fontFamily: 'var(--display)'
            }}>
              {score}%
            </span>
            <span style={{
              fontSize: 11,
              color: 'var(--text3)',
              fontFamily: 'var(--mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {getScoreLabel(score)}
            </span>
          </div>
        </div>
        
        <div style={{
          width: '100%',
          height: 6,
          background: 'var(--surface3)',
          borderRadius: 3,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${score}%`,
            height: '100%',
            background: getScoreColor(score),
            transition: 'width 0.8s ease',
            borderRadius: 3
          }} />
        </div>
      </div>
    </div>
  )
}

const IssueGroup: React.FC<{
  title: string
  issues: ValidationIssue[]
  severity: 'error' | 'warning' | 'suggestion'
  defaultOpen?: boolean
}> = ({ title, issues, severity, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen)

  if (issues.length === 0) return null

  const getSeverityColor = (severity: string) => {
    const colorMap = {
      error: 'var(--red)',
      warning: 'var(--amber)', 
      suggestion: 'var(--blue)'
    }
    return colorMap[severity as keyof typeof colorMap] || 'var(--text3)'
  }

  return (
    <div style={{
      border: '1px solid var(--border2)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--surface2)',
          border: 'none',
          cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border2)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SeverityIcon severity={severity} />
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text)',
            fontFamily: 'var(--display)'
          }}>
            {title}
          </span>
          <span style={{
            fontSize: 10,
            fontFamily: 'var(--mono)',
            color: 'var(--text3)',
            background: getSeverityColor(severity) + '20',
            border: `1px solid ${getSeverityColor(severity)}40`,
            padding: '2px 6px',
            borderRadius: 10
          }}>
            {issues.length}
          </span>
        </div>
        
        <div style={{
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          display: 'flex'
        }}>
          <Icon name="ChevronRight" size={12} strokeWidth={2} color="var(--text3)" />
        </div>
      </button>

      {open && (
        <div style={{ background: 'var(--surface)' }}>
          {issues.map((issue, i) => (
            <div
              key={i}
              style={{
                padding: '12px 16px',
                borderBottom: i < issues.length - 1 ? '1px solid var(--border2)' : 'none'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}>
                <SeverityIcon severity={issue.severity} />
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4
                  }}>
                    <span style={{
                      fontSize: 11,
                      fontFamily: 'var(--mono)',
                      color: 'var(--text)',
                      fontWeight: 500
                    }}>
                      {issue.message}
                    </span>
                    {issue.lineNumber && (
                      <span style={{
                        fontSize: 9,
                        fontFamily: 'var(--mono)',
                        color: 'var(--text3)',
                        background: 'var(--surface3)',
                        padding: '1px 4px',
                        borderRadius: 2,
                        border: '1px solid var(--border2)'
                      }}>
                        Line {issue.lineNumber}
                      </span>
                    )}
                  </div>
                  
                  <div style={{
                    fontSize: 10,
                    color: 'var(--text3)',
                    lineHeight: 1.4,
                    fontFamily: 'var(--mono)'
                  }}>
                    💡 {issue.suggestion}
                  </div>
                  
                  {issue.code && (
                    <div style={{
                      fontSize: 9,
                      fontFamily: 'var(--mono)',
                      color: 'var(--text3)',
                      marginTop: 4,
                      opacity: 0.7
                    }}>
                      Code: {issue.code}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({ validation, onRevalidate }) => {
  if (!validation) return null

  const { issues, summary } = validation
  
  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')
  const suggestions = issues.filter(i => i.severity === 'suggestion')

  return (
    <div style={{
      padding: '16px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      margin: '16px 0'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="CheckCircle2" size={16} color={validation.isValid ? 'var(--green)' : 'var(--amber)'} strokeWidth={1.5} />
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text)',
            fontFamily: 'var(--display)'
          }}>
            Validation Results
          </span>
        </div>
        
        {onRevalidate && (
          <button
            onClick={onRevalidate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: 'transparent',
              border: '1px solid var(--border2)',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--text3)',
              fontFamily: 'var(--mono)'
            }}
          >
            <Icon name="RefreshCw" size={10} strokeWidth={1.5} />
            Re-check
          </button>
        )}
      </div>

      {/* Quality Score */}
      <QualityScoreBar score={validation.qualityScore} />

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        margin: '16px 0',
        padding: '12px',
        background: 'var(--surface2)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border2)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: summary.errors > 0 ? 'var(--red)' : 'var(--green)',
            fontFamily: 'var(--display)'
          }}>
            {summary.errors}
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text3)',
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Errors
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: summary.warnings > 0 ? 'var(--amber)' : 'var(--green)',
            fontFamily: 'var(--display)'
          }}>
            {summary.warnings}
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text3)',
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Warnings
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--blue)',
            fontFamily: 'var(--display)'
          }}>
            {summary.suggestions}
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text3)',
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Suggestions
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text2)',
            fontFamily: 'var(--display)'
          }}>
            {summary.passedChecks}/{summary.totalChecks}
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text3)',
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Checks
          </div>
        </div>
      </div>

      {/* Issue Groups */}
      {summary.totalIssues > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <IssueGroup 
            title="Critical Errors" 
            issues={errors} 
            severity="error"
            defaultOpen={errors.length > 0}
          />
          <IssueGroup 
            title="Warnings" 
            issues={warnings} 
            severity="warning"
            defaultOpen={false}
          />
          <IssueGroup 
            title="Improvement Suggestions" 
            issues={suggestions} 
            severity="suggestion"
            defaultOpen={false}
          />
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: 'var(--text3)',
          fontSize: 12,
          fontFamily: 'var(--mono)'
        }}>
          <Icon name="CheckCircle" size={24} color="var(--green)" strokeWidth={1.5} style={{ marginBottom: 8 }} />
          <br />
          No issues found! Your OpenAPI spec looks great. 🎉
        </div>
      )}
    </div>
  )
}

export default ValidationPanel