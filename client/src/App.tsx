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
import { ParsedRoute } from './types/api'

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
  const accentColor = '#a78bfa'
  const port = 3000

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

  // Mock response data based on endpoint
  const generateMockResponse = (endpoint: ParsedRoute): any => {
    const { method, path } = endpoint
    
    if (path.includes('/customers')) {
      if (method === 'GET' && !path.includes('{id}')) {
        return {
          data: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              phone: '+1234567890',
              age: 35,
              status: 'active',
              createdAt: '2023-01-15T10:30:00Z'
            },
            {
              id: '456e7890-e89b-12d3-a456-426614174001',
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane.smith@example.com',
              phone: '+1234567891',
              age: 28,
              status: 'active',
              createdAt: '2023-02-20T14:15:00Z'
            }
          ],
          total: 2,
          page: 1,
          limit: 10
        }
      } else if (method === 'GET' && path.includes('{id}')) {
        return {
          id: '123e4567-e89b-12d3-a456-426614174000',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          age: 35,
          status: 'active',
          createdAt: '2023-01-15T10:30:00Z',
          updatedAt: '2023-01-15T10:30:00Z'
        }
      } else if (method === 'POST') {
        return {
          id: '789e0123-e89b-12d3-a456-426614174002',
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice.johnson@example.com',
          phone: '+1234567892',
          age: 32,
          status: 'active',
          createdAt: new Date().toISOString()
        }
      }
    } else if (path.includes('/orders')) {
      if (method === 'GET' && !path.includes('{id}')) {
        return {
          data: [
            {
              id: '987e6543-e21b-43d3-a456-426614174001',
              customerId: '123e4567-e89b-12d3-a456-426614174000',
              totalAmount: 299.99,
              currency: 'USD',
              status: 'processing',
              items: [
                {
                  id: 'item_001',
                  productName: 'Wireless Headphones',
                  quantity: 1,
                  unitPrice: 149.99
                },
                {
                  id: 'item_002',
                  productName: 'USB Cable',
                  quantity: 2,
                  unitPrice: 75.00
                }
              ],
              createdAt: '2023-01-15T14:30:00Z'
            }
          ],
          total: 1,
          page: 1
        }
      } else if (method === 'GET' && path.includes('{id}')) {
        return {
          id: '987e6543-e21b-43d3-a456-426614174001',
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          totalAmount: 299.99,
          currency: 'USD',
          status: 'processing',
          items: [
            {
              id: 'item_001',
              productName: 'Wireless Headphones',
              quantity: 1,
              unitPrice: 149.99
            }
          ],
          shippingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            postalCode: '62701',
            country: 'US'
          },
          createdAt: '2023-01-15T14:30:00Z',
          updatedAt: '2023-01-15T14:30:00Z'
        }
      } else if (method === 'POST') {
        return {
          id: '654e3210-e21b-43d3-a456-426614174003',
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          totalAmount: 199.99,
          currency: 'USD',
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      }
    }
    
    return { message: 'Success', timestamp: new Date().toISOString() }
  }

  const handleTryEndpoint = async (endpoint: ParsedRoute) => {
    setSelectedEndpoint(endpoint)
    setLoadingResponse(true)
    setResponse(null)

    const startTime = Date.now()
    
    try {
      // Make real HTTP request to the backend mock server
      const response = await fetch(endpoint.path, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        // Add sample request body for POST requests
        ...(endpoint.method === 'POST' && {
          body: JSON.stringify(getSampleRequestBody(endpoint))
        })
      })

      const responseTime = Date.now() - startTime
      let responseBody = null

      try {
        responseBody = await response.json()
      } catch (err) {
        // Handle non-JSON responses
        responseBody = await response.text()
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
        path: endpoint.path,
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

  const getSampleRequestBody = (endpoint: ParsedRoute) => {
    if (endpoint.path.includes('/customers')) {
      return {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@example.com',
        phone: '+1234567890',
        age: 32
      }
    } else if (endpoint.path.includes('/orders')) {
      return {
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        totalAmount: 199.99,
        currency: 'USD',
        items: [
          {
            productName: 'Wireless Headphones',
            quantity: 1,
            unitPrice: 199.99
          }
        ]
      }
    }
    return {}
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
        port={port}
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
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        background: 'var(--bg)'
      }}>
        {/* Endpoints list */}
        <div style={{
          width: routes.length > 0 ? '48%' : '100%',
          borderRight: routes.length > 0 ? '1px solid var(--border)' : 'none',
          overflow: 'auto',
          background: 'var(--surface)',
          transition: 'width 0.3s ease'
        }}>
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
            marginLeft: '4px'
          }}>
            <ResponsePanel
              selectedEndpoint={selectedEndpoint}
              onTryEndpoint={handleTryEndpoint}
              response={response}
              loading={loadingResponse}
              accentColor={accentColor}
            />
          </div>
        )}
      </div>

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