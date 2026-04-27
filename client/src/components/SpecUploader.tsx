import React, { useState } from 'react'
import { ParsedRoute, ParseSpecResponse, ApiError } from '../types/api'
import Icon from './Icon'

interface SpecUploaderProps {
  onSpecParsed: (routes: ParsedRoute[], info: any, validation?: any) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  specInfo: any
  routes: ParsedRoute[]
  accentColor: string
  onShowAIInterface?: () => void
}

const SpecUploader: React.FC<SpecUploaderProps> = ({ 
  onSpecParsed, 
  isLoading, 
  setIsLoading, 
  specInfo, 
  routes, 
  accentColor,
  onShowAIInterface
}) => {
  const [dragging, setDragging] = useState(false)
  const [showPasteInput, setShowPasteInput] = useState(false)
  const [pasteContent, setPasteContent] = useState('')
  const [specFormat, setSpecFormat] = useState<'yaml' | 'json'>('yaml')
  const [originalSpec, setOriginalSpec] = useState('')

  const parseSpecFromText = async (spec: string, type: 'yaml' | 'json') => {
    setIsLoading(true)
    
    try {
      // Parse the spec using the backend API
      const parseResponse = await fetch('/api/parse-spec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spec, type }),
        credentials: 'include'
      })

      const parseData: ParseSpecResponse | ApiError = await parseResponse.json()

      if (!parseResponse.ok) {
        throw new Error((parseData as ApiError).message || 'Failed to parse spec')
      }

      const result = parseData as ParseSpecResponse
      
      // Store original spec for editing
      console.log('Storing original spec for editing, length:', spec.length)
      setOriginalSpec(spec)
      
      // Get the routes from the API
      const routesResponse = await fetch('/api/routes', { credentials: 'include' })
      const routesData = await routesResponse.json()
      
      // Add groups based on the path structure
      const routesWithGroups = routesData.routes.map((route: ParsedRoute, index: number) => ({
        ...route,
        id: index + 1,
        group: route.path.startsWith('/customers') ? 'Customers' : 
               route.path.startsWith('/orders') ? 'Orders' : 'API'
      }))
      
      // Store original spec for editing
      setOriginalSpec(spec)
      
      onSpecParsed(routesWithGroups, result.info, result.validation)
      
      // Close modal after successful parsing
      setShowPasteInput(false)
      setPasteContent('')
      setIsLoading(false)
    } catch (err) {
      setIsLoading(false)
      console.error('Failed to parse spec:', err)
    }
  }

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        const fileType = file.name.endsWith('.json') ? 'json' : 'yaml'
        parseSpecFromText(content, fileType)
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const file = files.find(f => 
      f.name.endsWith('.yaml') || 
      f.name.endsWith('.yml') || 
      f.name.endsWith('.json')
    )
    
    if (file) {
      handleFileUpload(file)
    } else {
      console.error('Please upload a .yaml, .yml, or .json file')
    }
  }

  const handlePaste = () => {
    if (pasteContent.trim()) {
      parseSpecFromText(pasteContent, specFormat)
    }
  }

  const loadDemo = async () => {
    setIsLoading(true)
    
    try {
      // Load the actual sample spec from the examples folder
      const response = await fetch('/examples/sample-spec.yaml', { credentials: 'include' })
      const sampleSpec = await response.text()
      
      // Parse the spec using the backend API
      const parseResponse = await fetch('/api/parse-spec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spec: sampleSpec, type: 'yaml' }),
        credentials: 'include'
      })

      const parseData: ParseSpecResponse | ApiError = await parseResponse.json()

      if (!parseResponse.ok) {
        throw new Error((parseData as ApiError).message || 'Failed to parse spec')
      }

      const result = parseData as ParseSpecResponse
      
      // Get the routes from the API
      const routesResponse = await fetch('/api/routes', { credentials: 'include' })
      const routesData = await routesResponse.json()
      
      // Add groups based on the path structure
      const routesWithGroups = routesData.routes.map((route: ParsedRoute, index: number) => ({
        ...route,
        id: index + 1,
        group: route.path.startsWith('/customers') ? 'Customers' : 
               route.path.startsWith('/orders') ? 'Orders' : 'API'
      }))
      
      // Store original spec for editing
      console.log('Demo loaded - storing spec length:', sampleSpec.length)
      setOriginalSpec(sampleSpec)
      
      onSpecParsed(routesWithGroups, result.info, result.validation)
      setIsLoading(false)
    } catch (err) {
      setIsLoading(false)
      console.error('Failed to load demo spec:', err)
    }
  }

  const clearSpec = () => {
    console.log('🚨 clearSpec called! This will close the modal!')
    onSpecParsed([], null, null)
    setIsLoading(false)
    setShowPasteInput(false)
    setPasteContent('')
    setSpecFormat('yaml')
    setDragging(false)
    setOriginalSpec('')
  }

  const editSpec = () => {
    // Open paste modal with the original spec content
    console.log('Edit clicked - originalSpec length:', originalSpec.length)
    console.log('Original spec preview:', originalSpec.slice(0, 100))
    console.log('showPasteInput before:', showPasteInput)
    
    if (originalSpec) {
      console.log('Setting showPasteInput to true with original spec...')
      setPasteContent(originalSpec)
      setSpecFormat(originalSpec.includes('openapi:') ? 'yaml' : 'json')
      setShowPasteInput(true)
    } else {
      console.warn('No original spec available for editing')
      // Still open the modal but empty
      setPasteContent('')
      setSpecFormat('yaml')
      setShowPasteInput(true)
    }
    console.log('Edit function completed')
    
    // Force a re-render check
    setTimeout(() => {
      console.log('showPasteInput after timeout:', showPasteInput)
    }, 100)
  }

  if (specInfo) {
    return (
      <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="CheckCircle" size={15} color="var(--green)" strokeWidth={2} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>
            sample-spec.yaml
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            14.2 KB
          </span>
          <div style={{
            padding: '2px 8px',
            borderRadius: 3,
            background: 'rgba(61,214,140,0.1)',
            border: '1px solid rgba(61,214,140,0.25)',
            color: 'var(--green)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em'
          }}>
            VALID • OpenAPI 3.0
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={editSpec}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text2)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'var(--display)'
            }}
          >
            <Icon name="Edit3" size={11} strokeWidth={2} />
            Edit
          </button>
          <button
            onClick={clearSpec}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text3)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'var(--display)'
            }}
          >
            <Icon name="Trash2" size={11} strokeWidth={2} />
            Clear
          </button>
        </div>
      </div>

      {/* Paste Input Modal for spec-loaded mode */}
      {showPasteInput && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000
          }}
          onClick={() => {
            console.log('Modal backdrop clicked')
            setShowPasteInput(false)
            setPasteContent('')
          }}
        >
          <div 
            onClick={(e) => {
              console.log('Modal content clicked')
              e.stopPropagation()
            }}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius2)',
              padding: '24px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16
            }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text)',
                fontFamily: 'var(--display)'
              }}>
                Edit OpenAPI Specification
              </h3>
              <button
                onClick={() => {
                  setShowPasteInput(false)
                  setPasteContent('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text3)',
                  cursor: 'pointer',
                  fontSize: 18
                }}
              >
                ×
              </button>
            </div>
            
            {/* Format Toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['yaml', 'json'].map((format) => (
                <button
                  key={format}
                  onClick={() => setSpecFormat(format as 'yaml' | 'json')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border2)',
                    background: specFormat === format ? accentColor + '20' : 'var(--surface2)',
                    color: specFormat === format ? accentColor : 'var(--text2)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--display)',
                    textTransform: 'uppercase'
                  }}
                >
                  {format}
                </button>
              ))}
            </div>
            
            {/* Code Editor with Line Numbers */}
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface2)',
              overflow: 'hidden',
              height: '300px',
              position: 'relative'
            }}>
              <div style={{
                display: 'flex',
                height: '100%',
                position: 'relative'
              }}>
                {/* Line Numbers - Synchronized Scroll */}
                <div 
                  id="edit-line-numbers"
                  style={{
                    width: '50px',
                    background: 'var(--surface3)',
                    borderRight: '1px solid var(--border2)',
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: 'var(--text3)',
                    textAlign: 'right',
                    overflow: 'hidden',
                    userSelect: 'none',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    padding: '12px 8px',
                    transform: 'translateY(var(--scroll-offset, 0px))'
                  }}>
                    {pasteContent.split('\n').map((_, i) => (
                      <div key={i} style={{ height: '16.8px' }}>
                        {i + 1}
                      </div>
                    ))}
                    {pasteContent === '' && <div style={{ height: '16.8px' }}>1</div>}
                  </div>
                </div>
                
                {/* Code Content */}
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  onScroll={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    const lineNumbersEl = document.getElementById('edit-line-numbers');
                    if (lineNumbersEl) {
                      const scrollOffset = -target.scrollTop;
                      lineNumbersEl.style.setProperty('--scroll-offset', `${scrollOffset}px`);
                    }
                  }}
                  placeholder={`Edit your OpenAPI ${specFormat.toUpperCase()} specification here...`}
                  style={{
                    flex: 1,
                    height: '100%',
                    padding: '12px',
                    border: 'none',
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: 'var(--text)',
                    background: 'transparent',
                    resize: 'none',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              gap: 8,
              marginTop: 16,
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowPasteInput(false)
                  setPasteContent('')
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border2)',
                  background: 'var(--surface2)',
                  color: 'var(--text2)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--display)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePaste}
                disabled={!pasteContent.trim() || isLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${accentColor}40`,
                  background: accentColor + '20',
                  color: accentColor,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--display)',
                  opacity: (!pasteContent.trim() || isLoading) ? 0.5 : 1
                }}
              >
                {isLoading ? 'Parsing...' : 'Update Spec'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    )
  }

  return (
    <div style={{
      padding: '20px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      flexShrink: 0
    }} className="spec-uploader-container">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? accentColor : 'var(--border2)'}`,
          borderRadius: 'var(--radius2)',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: dragging ? 'rgba(245,166,35,0.08)' : 'var(--surface2)',
          transition: 'all 0.25s ease',
          cursor: 'default',
          boxShadow: dragging ? '0 4px 20px rgba(245,166,35,0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
        }}
        className="spec-upload-box"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }} className="spec-upload-content">
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: 'linear-gradient(135deg, var(--surface3), var(--surface))',
            border: '1px solid var(--border2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <Icon name="Upload" size={18} color="var(--text2)" strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ 
              fontSize: 15, 
              fontWeight: 600, 
              color: 'var(--text)', 
              marginBottom: 4,
              fontFamily: 'var(--display)',
              letterSpacing: '-0.01em'
            }}>
              Drop your OpenAPI spec here
            </div>
            <div style={{ 
              fontSize: 12, 
              color: 'var(--text3)',
              lineHeight: 1.4,
              fontFamily: 'var(--mono)'
            }}>
              Supports JSON or YAML — OpenAPI 2.0 / 3.0 / 3.1
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }} className="spec-upload-buttons">
          {onShowAIInterface && (
            <button
              onClick={onShowAIInterface}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 'var(--radius)',
                border: `1px solid ${accentColor}30`,
                background: `linear-gradient(135deg, ${accentColor}12, ${accentColor}08)`,
                color: accentColor,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--display)',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              className="spec-upload-button"
            >
              Generate with AI
            </button>
          )}
          <input
            type="file"
            accept=".yaml,.yml,.json"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
            }}
            style={{ display: 'none' }}
            id="file-upload-input"
          />
          <label
            htmlFor="file-upload-input"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 'var(--radius)',
              border: `1px solid ${accentColor}30`,
              background: `linear-gradient(135deg, ${accentColor}12, ${accentColor}08)`,
              color: accentColor,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--display)',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            className="spec-upload-button"
          >
            <Icon name="FolderOpen" size={14} strokeWidth={1.5} />
            Browse
          </label>
          <button
            onClick={() => setShowPasteInput(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 'var(--radius)',
              border: `1px solid ${accentColor}30`,
              background: `linear-gradient(135deg, ${accentColor}12, ${accentColor}08)`,
              color: accentColor,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--display)',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            className="spec-upload-button"
          >
            <Icon name="Clipboard" size={14} strokeWidth={1.5} />
            Paste
          </button>

          <div style={{ width: 1, height: 24, background: 'var(--border2)', margin: '0 4px' }} className="spec-button-divider" />

          <button
            onClick={loadDemo}
            disabled={isLoading}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius)',
              border: `1px solid ${accentColor}40`,
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}E6)`,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--display)',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(245,166,35,0.25)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}
            className="spec-demo-button"
          >
            {isLoading ? 'Loading...' : 'Load Demo'}
          </button>
        </div>
      </div>
      
      {/* Paste Input Modal */}
      {showPasteInput && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000
          }}
          onClick={() => {
            console.log('Modal backdrop clicked')
            setShowPasteInput(false)
            setPasteContent('')
          }}
        >
          <div 
            onClick={(e) => {
              console.log('Modal content clicked')
              e.stopPropagation()
            }}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius2)',
              padding: '24px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16
            }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text)',
                fontFamily: 'var(--display)'
              }}>
                Paste OpenAPI Specification
              </h3>
              <button
                onClick={() => {
                  setShowPasteInput(false)
                  setPasteContent('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text3)',
                  cursor: 'pointer',
                  fontSize: 18
                }}
              >
                ×
              </button>
            </div>
            
            {/* Format Toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['yaml', 'json'].map((format) => (
                <button
                  key={format}
                  onClick={() => setSpecFormat(format as 'yaml' | 'json')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border2)',
                    background: specFormat === format ? accentColor + '20' : 'var(--surface2)',
                    color: specFormat === format ? accentColor : 'var(--text2)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--display)',
                    textTransform: 'uppercase'
                  }}
                >
                  {format}
                </button>
              ))}
            </div>
            
            {/* Code Editor with Line Numbers */}
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface2)',
              overflow: 'hidden',
              height: '300px',
              position: 'relative'
            }}>
              <div style={{
                display: 'flex',
                height: '100%',
                position: 'relative'
              }}>
                {/* Line Numbers - Synchronized Scroll */}
                <div 
                  id="line-numbers"
                  style={{
                    width: '50px',
                    background: 'var(--surface3)',
                    borderRight: '1px solid var(--border2)',
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: 'var(--text3)',
                    textAlign: 'right',
                    overflow: 'hidden',
                    userSelect: 'none',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    padding: '12px 8px',
                    transform: 'translateY(var(--scroll-offset, 0px))'
                  }}>
                    {pasteContent.split('\n').map((_, i) => (
                      <div key={i} style={{ height: '16.8px' }}>
                        {i + 1}
                      </div>
                    ))}
                    {pasteContent === '' && <div style={{ height: '16.8px' }}>1</div>}
                  </div>
                </div>
                
                {/* Code Content */}
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  onScroll={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    const lineNumbersEl = document.getElementById('line-numbers');
                    if (lineNumbersEl) {
                      const scrollOffset = -target.scrollTop;
                      lineNumbersEl.style.setProperty('--scroll-offset', `${scrollOffset}px`);
                    }
                  }}
                  placeholder={`Paste your OpenAPI ${specFormat.toUpperCase()} specification here...`}
                  style={{
                    flex: 1,
                    height: '100%',
                    padding: '12px',
                    border: 'none',
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: 'var(--text)',
                    background: 'transparent',
                    resize: 'none',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              gap: 8,
              marginTop: 16,
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowPasteInput(false)
                  setPasteContent('')
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border2)',
                  background: 'var(--surface2)',
                  color: 'var(--text2)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--display)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePaste}
                disabled={!pasteContent.trim() || isLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${accentColor}40`,
                  background: accentColor + '20',
                  color: accentColor,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--display)',
                  opacity: (!pasteContent.trim() || isLoading) ? 0.5 : 1
                }}
              >
                {isLoading ? 'Parsing...' : 'Parse Spec'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SpecUploader