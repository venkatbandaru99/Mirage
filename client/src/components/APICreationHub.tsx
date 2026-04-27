/**
 * MirageAPI - OpenAPI Mock Server
 * Copyright (c) 2024 Satya Bandaru. All rights reserved.
 * Licensed under the MIT License. See LICENSE file for details.
 */

import React, { useState } from 'react'
import Icon from './Icon'

interface APICreationHubProps {
  accentColor: string
  onSpecGenerated: (spec: string, type: 'yaml' | 'json') => void
}

type TabType = 'upload' | 'generate' | 'demo'

const APICreationHub: React.FC<APICreationHubProps> = ({ 
  accentColor, 
  onSpecGenerated 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('generate')
  const [apiDescription, setApiDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const tabs = [
    {
      id: 'upload' as TabType,
      label: 'Upload Spec',
      icon: 'Upload',
      description: 'Upload existing OpenAPI file'
    },
    {
      id: 'generate' as TabType, 
      label: 'Generate with AI',
      icon: 'Zap',
      description: 'Describe your API in plain English'
    },
    {
      id: 'demo' as TabType,
      label: 'Load Demo',
      icon: 'Play',
      description: 'Try with sample e-commerce API'
    }
  ]

  const handleAIGenerate = async () => {
    if (!apiDescription.trim()) return
    
    setIsGenerating(true)
    
    // TODO: Phase 2 - Replace with actual AI generation
    // For now, generate a simple template based on description
    try {
      const generatedSpec = generateSimpleSpec(apiDescription)
      onSpecGenerated(generatedSpec, 'yaml')
    } catch (error) {
      console.error('Failed to generate spec:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Temporary template generation - will be replaced with AI in Phase 2
  const generateSimpleSpec = (description: string): string => {
    const timestamp = new Date().toISOString()
    
    return `openapi: 3.0.0
info:
  title: Generated API
  version: 1.0.0
  description: ${description}
  
servers:
  - url: http://localhost:3001
    description: Local development server

paths:
  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: API is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: "healthy"
                  timestamp:
                    type: string
                    example: "${timestamp}"

components:
  schemas:
    Error:
      type: object
      properties:
        message:
          type: string
        code:
          type: integer`
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              border: '2px dashed var(--border2)',
              background: 'var(--surface2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              margin: '0 auto 24px'
            }}>
              📄
            </div>
            <div style={{ 
              fontSize: 16, 
              fontWeight: 600,
              color: 'var(--text2)', 
              marginBottom: 8,
              fontFamily: 'var(--display)'
            }}>
              Upload OpenAPI Specification
            </div>
            <div style={{ 
              fontSize: 13, 
              color: 'var(--text3)',
              lineHeight: 1.5,
              marginBottom: 24
            }}>
              Drag & drop your YAML or JSON file above, or use the Browse button
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Supports OpenAPI 2.0, 3.0, and 3.1
            </div>
          </div>
        )

      case 'generate':
        return (
          <div style={{ padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                border: `2px dashed ${accentColor}`,
                background: accentColor + '10',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                margin: '0 auto 24px'
              }}>
                🤖
              </div>
              <div style={{ 
                fontSize: 16, 
                fontWeight: 600,
                color: 'var(--text2)', 
                marginBottom: 8,
                fontFamily: 'var(--display)'
              }}>
                Describe Your API
              </div>
              <div style={{ 
                fontSize: 13, 
                color: 'var(--text3)',
                lineHeight: 1.5
              }}>
                Tell me what your API should do, and I'll generate the OpenAPI specification
              </div>
            </div>

            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <textarea
                value={apiDescription}
                onChange={(e) => setApiDescription(e.target.value)}
                placeholder="Example: I need a user management API with registration, login, user profiles, and password reset functionality..."
                style={{
                  width: '100%',
                  minHeight: 120,
                  padding: '16px',
                  border: `1px solid ${apiDescription ? accentColor : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 14,
                  fontFamily: 'var(--display)',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
              />
              
              <button
                onClick={handleAIGenerate}
                disabled={!apiDescription.trim() || isGenerating}
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: '12px 24px',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${accentColor}`,
                  background: accentColor,
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: !apiDescription.trim() || isGenerating ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--display)',
                  opacity: !apiDescription.trim() || isGenerating ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {isGenerating ? (
                  <>
                    <div style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon name="Zap" size={16} strokeWidth={2} />
                    Generate API Specification
                  </>
                )}
              </button>

              <div style={{ 
                marginTop: 16, 
                fontSize: 12, 
                color: 'var(--text3)', 
                textAlign: 'center' 
              }}>
                🔒 All processing happens locally in your browser
              </div>
            </div>
          </div>
        )

      case 'demo':
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              border: '2px dashed var(--green)',
              background: 'rgba(24,168,107,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              margin: '0 auto 24px'
            }}>
              ⚡
            </div>
            <div style={{ 
              fontSize: 16, 
              fontWeight: 600,
              color: 'var(--text2)', 
              marginBottom: 8,
              fontFamily: 'var(--display)'
            }}>
              Try Sample E-commerce API
            </div>
            <div style={{ 
              fontSize: 13, 
              color: 'var(--text3)',
              lineHeight: 1.5,
              marginBottom: 24
            }}>
              Load a complete customer & order management API to explore MirageAPI features
            </div>
            <button
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--green)',
                background: 'var(--green)',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--display)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                margin: '0 auto'
              }}
              onClick={() => {
                // TODO: Integrate with existing demo loading functionality
                console.log('Load demo clicked')
              }}
            >
              <Icon name="Play" size={16} strokeWidth={2} />
              Load Demo API
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface2)',
        padding: '0 20px'
      }} className="api-creation-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '16px 20px',
              border: 'none',
              background: 'none',
              color: activeTab === tab.id ? accentColor : 'var(--text3)',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 500,
              cursor: 'pointer',
              borderBottom: `2px solid ${activeTab === tab.id ? accentColor : 'transparent'}`,
              transition: 'all 0.2s ease',
              fontFamily: 'var(--display)',
              position: 'relative'
            }}
            className="tab-button"
          >
            <Icon 
              name={tab.icon as any} 
              size={14} 
              strokeWidth={activeTab === tab.id ? 2.5 : 2} 
            />
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {renderTabContent()}
      </div>
    </div>
  )
}

export default APICreationHub