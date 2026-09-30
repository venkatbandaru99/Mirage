/**
 * MirageAPI - OpenAPI Mock Server
 * Copyright (c) 2024 Satya Bandaru. All rights reserved.
 * Licensed under the MIT License. See LICENSE file for details.
 */

import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import SpecUploader from './components/SpecUploader'
import EndpointExplorer from './components/EndpointExplorer'
import ResponsePanel from './components/ResponsePanel'
import LogStrip, { LogEntry } from './components/LogStrip'
import SimpleValidationPanel from './components/SimpleValidationPanel'
import Footer from './components/Footer'
import { ParsedRoute, MockOptions } from './types/api'

interface ResponseData {
  status: number
  body: any
  ms: number
  ts: number
}

function App() {
  const [routes, setRoutes] = useState<ParsedRoute[]>([])
  const [specInfo, setSpecInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [serverRunning, setServerRunning] = useState(false)
  const [serverLoading, setServerLoading] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState<ParsedRoute | null>(null)
  const [response, setResponse] = useState<ResponseData | null>(null)
  const [loadingResponse, setLoadingResponse] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logOpen, setLogOpen] = useState(true)
  const [validationResults, setValidationResults] = useState<any>(null)
  const [showValidation, setShowValidation] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mockOptions, setMockOptions] = useState<MockOptions>({ status: '', delay: '', useExamples: false })
  const accentColor = '#a78bfa'

  // Initialize session on app load
  useEffect(() => {
    checkServerStatus()
  }, [])

  const handleSpecParsed = (parsedRoutes: ParsedRoute[], info: any, validation?: any) => {
    console.log('🔍 handleSpecParsed called with:', { parsedRoutes: parsedRoutes.length, info, validation })
    setRoutes(parsedRoutes)
    setSpecInfo(info)
    setValidationResults(validation)
    setShowValidation(true) // Always show validation when new spec is parsed
    console.log('🔍 validationResults state set to:', validation)
    setSelectedEndpoint(null)
    setResponse(null)
    setLogs([])
    checkServerStatus()
  }

  const checkServerStatus = async () => {
    try {
      const response = await fetch('/api/server/status')
      const data = await response.json()
      setServerRunning(data.running)
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId)
      }
    } catch (err) {
      console.error('Failed to check server status:', err)
    }
  }

  const toggleServer = async () => {
    setServerLoading(true)
    try {
      const endpoint = serverRunning ? '/api/server/stop' : '/api/server/start'
      const response = await fetch(endpoint, { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setServerRunning(!serverRunning)
      }
    } catch (err) {
      console.error('Failed to toggle server:', err)
    } finally {
      setServerLoading(false)
    }
  }

  const handleTryEndpoint = async (endpoint: ParsedRoute) => {
    setSelectedEndpoint(endpoint)
    setLoadingResponse(true)
    setResponse(null)

    const startTime = Date.now()
    
    try {
      // Ask the server for a valid request for this route (path params
      // filled in, required query params, generated body), then send it
      const sampleResponse = await fetch(`/api/sample-request?route=${encodeURIComponent(`${endpoint.method} ${endpoint.path}`)}`)
      const sample = sampleResponse.ok
        ? await sampleResponse.json()
        : { path: endpoint.path, query: {}, body: undefined }

      const query = new URLSearchParams()
      for (const [name, value] of Object.entries(sample.query || {})) {
        query.set(name, String(value))
      }
      // Mock controls from the response panel
      if (mockOptions.status) query.set('__status', mockOptions.status)
      if (mockOptions.delay) query.set('__delay', mockOptions.delay)
      if (mockOptions.useExamples) query.set('__example', 'true')
      const queryString = query.toString()
      const url = queryString ? `${sample.path}?${queryString}` : sample.path

      // Make real HTTP request to the backend mock server
      const response = await fetch(url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        ...(sample.body !== undefined && ['POST', 'PUT', 'PATCH'].includes(endpoint.method) && {
          body: JSON.stringify(sample.body)
        })
      })

      const responseTime = Date.now() - startTime
      // Read the body once: JSON when possible, raw text otherwise, null when
      // empty (e.g. 204 No Content)
      const responseText = await response.text()
      let responseBody: any = null
      if (responseText) {
        try {
          responseBody = JSON.parse(responseText)
        } catch (err) {
          responseBody = responseText
        }
      }

      setResponse({
        status: response.status,
        body: responseBody,
        ms: responseTime,
        ts: Date.now()
      })

      // Add to logs
      const now = new Date()
      const time = now.toTimeString().slice(0, 8)
      const newLog: LogEntry = {
        id: Date.now(),
        time,
        method: endpoint.method,
        path: url,
        status: response.status,
        ms: responseTime
      }
      
      setLogs((prev) => [...prev.slice(-49), newLog]) // Keep last 50 logs
    } catch (err) {
      const responseTime = Date.now() - startTime
      
      setResponse({
        status: 500,
        body: { 
          error: 'Network Error', 
          message: err instanceof Error ? err.message : 'Failed to connect to server' 
        },
        ms: responseTime,
        ts: Date.now()
      })

      // Add error to logs
      const now = new Date()
      const time = now.toTimeString().slice(0, 8)
      const newLog: LogEntry = {
        id: Date.now(),
        time,
        method: endpoint.method,
        path: endpoint.path,
        status: 500,
        ms: responseTime
      }
      
      setLogs((prev) => [...prev.slice(-49), newLog])
    } finally {
      setLoadingResponse(false)
    }
  }

  const handleRevalidate = async () => {
    // Re-validate the current spec to get fresh validation results
    try {
      // First get the current parsed routes to know we have a spec loaded
      const routesResponse = await fetch('/api/routes')
      const routesData = await routesResponse.json()
      
      if (!routesData.routes || routesData.routes.length === 0) {
        console.log('No spec loaded to revalidate')
        return
      }

      // Get fresh validation results by hitting the validation endpoint
      const validationResponse = await fetch('/api/validate-current-spec')
      if (validationResponse.ok) {
        const validationData = await validationResponse.json()
        setValidationResults(validationData.validation)
        console.log('Re-validation complete - updated validation results')
      } else {
        // Fallback: refresh server status
        const response = await fetch('/api/server/status')
        const data = await response.json()
        setServerRunning(data.running)
        console.log('Re-validation triggered - server status refreshed')
      }
    } catch (err) {
      console.error('Failed to re-validate:', err)
    }
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden',
      background: 'var(--bg)',
      fontFamily: 'var(--display)'
    }}>
      <Header
        serverRunning={serverRunning}
        onToggleServer={toggleServer}
        accentColor={accentColor}
        sessionId={sessionId || undefined}
      />

      <SpecUploader 
        onSpecParsed={handleSpecParsed}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        specInfo={specInfo}
        routes={routes}
        accentColor={accentColor}
      />

      {/* Validation Results */}
      {validationResults && showValidation && (
        <SimpleValidationPanel 
          validation={validationResults}
          onRevalidate={handleRevalidate}
          onHide={() => setShowValidation(false)}
        />
      )}

      {/* Main content */}
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        background: 'var(--bg)',
        flexDirection: 'row'
      }} className="main-content">
        {/* Endpoints list */}
        <div style={{
          width: routes.length > 0 ? '48%' : '100%',
          borderRight: routes.length > 0 ? '1px solid var(--border)' : 'none',
          overflow: 'auto',
          background: 'var(--surface)',
          transition: 'width 0.3s ease',
          minHeight: 0
        }} className="endpoints-panel">
          {routes.length === 0 && (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 20,
              color: 'var(--text3)',
              padding: '40px 20px'
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                border: '2px dashed var(--border2)',
                background: 'var(--surface2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32
              }}>
                📄
              </div>
              <div style={{ textAlign: 'center', maxWidth: 320 }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 600,
                  color: 'var(--text2)', 
                  marginBottom: 8,
                  fontFamily: 'var(--display)'
                }}>
                  No spec loaded
                </div>
                <div style={{ 
                  fontSize: 13, 
                  color: 'var(--text3)',
                  lineHeight: 1.5
                }}>
                  Upload an OpenAPI spec to discover endpoints and start testing your API
                </div>
              </div>
            </div>
          )}

          {routes.length > 0 && (
            <div style={{ padding: '16px 0' }}>
              <EndpointExplorer 
                routes={routes} 
                selectedEndpoint={selectedEndpoint}
                onSelectEndpoint={setSelectedEndpoint}
                onTryEndpoint={handleTryEndpoint}
              />
            </div>
          )}
        </div>

        {/* Response panel */}
        {routes.length > 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface)',
            overflow: 'hidden',
            marginLeft: '4px',
            minHeight: 0
          }} className="response-panel">
            <ResponsePanel
              selectedEndpoint={selectedEndpoint}
              onTryEndpoint={handleTryEndpoint}
              response={response}
              loading={loadingResponse}
              mockOptions={mockOptions}
              onMockOptionsChange={setMockOptions}
              accentColor={accentColor}
            />
          </div>
        )}
      </main>

      <LogStrip 
        logs={logs} 
        open={logOpen} 
        onToggle={() => setLogOpen(o => !o)} 
      />

      <Footer />
    </div>
  )
}

export default App