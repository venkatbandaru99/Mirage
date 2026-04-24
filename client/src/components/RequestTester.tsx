import React, { useState, useEffect } from 'react'
import { ParsedRoute, RequestFormData } from '../types/api'
import ResponseViewer from './ResponseViewer'

interface RequestTesterProps {
  route: ParsedRoute
}

const RequestTester: React.FC<RequestTesterProps> = ({ route }) => {
  const [formData, setFormData] = useState<RequestFormData>({
    method: route.method,
    path: route.path,
    pathParams: {},
    queryParams: {},
    headers: {},
    body: ''
  })
  const [response, setResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when route changes
  useEffect(() => {
    setFormData({
      method: route.method,
      path: route.path,
      pathParams: {},
      queryParams: {},
      headers: {},
      body: route.hasRequestBody ? JSON.stringify({}, null, 2) : ''
    })
    setResponse(null)
    setError(null)
  }, [route])

  const pathParams = route.parameters?.filter(p => p.in === 'path') || []
  const queryParams = route.parameters?.filter(p => p.in === 'query') || []

  const updatePathParam = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      pathParams: { ...prev.pathParams, [name]: value }
    }))
  }

  const updateQueryParam = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      queryParams: { ...prev.queryParams, [name]: value }
    }))
  }

  const updateHeader = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      headers: { ...prev.headers, [name]: value }
    }))
  }

  const buildRequestUrl = () => {
    let url = route.path
    
    // Replace path parameters
    Object.entries(formData.pathParams).forEach(([name, value]) => {
      url = url.replace(`{${name}}`, encodeURIComponent(value))
    })

    // Add query parameters
    const queryString = Object.entries(formData.queryParams)
      .filter(([_, value]) => value.trim() !== '')
      .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
      .join('&')

    return queryString ? `${url}?${queryString}` : url
  }

  const sendRequest = async () => {
    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const url = buildRequestUrl()
      const headers = {
        'Content-Type': 'application/json',
        ...formData.headers
      }

      const requestOptions: RequestInit = {
        method: formData.method,
        headers,
      }

      if (route.hasRequestBody && formData.body.trim()) {
        requestOptions.body = formData.body
      }

      const startTime = Date.now()
      const response = await fetch(url, requestOptions)
      const endTime = Date.now()
      
      const responseText = await response.text()
      let responseData
      
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = responseText
      }

      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        responseTime: endTime - startTime
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setIsLoading(false)
    }
  }

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-green-700'
      case 'POST': return 'text-blue-700'
      case 'PUT': return 'text-orange-700'
      case 'PATCH': return 'text-yellow-700'
      case 'DELETE': return 'text-red-700'
      default: return 'text-gray-700'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <span className={`font-bold text-lg ${getMethodColor(route.method)}`}>
            {route.method}
          </span>
          <span className="font-mono text-gray-900">{route.path}</span>
        </div>
        <p className="text-sm text-gray-600">
          Response types: {route.responseTypes.join(', ')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Path Parameters */}
        {pathParams.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Path Parameters</h4>
            <div className="space-y-3">
              {pathParams.map((param) => (
                <div key={param.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {param.name}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.pathParams[param.name] || ''}
                    onChange={(e) => updatePathParam(param.name, e.target.value)}
                    placeholder={`Enter ${param.name}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={param.required}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Query Parameters */}
        {queryParams.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Query Parameters</h4>
            <div className="space-y-3">
              {queryParams.map((param) => (
                <div key={param.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {param.name}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.queryParams[param.name] || ''}
                    onChange={(e) => updateQueryParam(param.name, e.target.value)}
                    placeholder={`Enter ${param.name}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={param.required}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Headers */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Headers (Optional)</h4>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Header name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Tab' || e.key === 'Enter') {
                    const headerName = (e.target as HTMLInputElement).value
                    const headerValue = ((e.target as HTMLInputElement).parentNode?.children[1] as HTMLInputElement)?.value
                    if (headerName && headerValue) {
                      updateHeader(headerName, headerValue)
                      ;(e.target as HTMLInputElement).value = ''
                      ;((e.target as HTMLInputElement).parentNode?.children[1] as HTMLInputElement).value = ''
                    }
                  }
                }}
              />
              <input
                type="text"
                placeholder="Header value"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            {Object.entries(formData.headers).length > 0 && (
              <div className="space-y-1">
                {Object.entries(formData.headers).map(([name, value]) => (
                  <div key={name} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-sm">
                    <span><strong>{name}:</strong> {value}</span>
                    <button
                      onClick={() => {
                        const newHeaders = { ...formData.headers }
                        delete newHeaders[name]
                        setFormData(prev => ({ ...prev, headers: newHeaders }))
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Request Body */}
        {route.hasRequestBody && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Request Body</h4>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Enter JSON request body..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
            />
          </div>
        )}

        {/* Send Button */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <strong>URL:</strong> <code className="bg-gray-100 px-1 rounded">{buildRequestUrl()}</code>
          </div>
          <button
            onClick={sendRequest}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{isLoading ? 'Sending...' : 'Send Request'}</span>
          </button>
        </div>
      </div>

      {/* Response Section */}
      {(response || error) && (
        <div className="mt-8 border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-3">Response</h4>
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <ResponseViewer response={response} />
          )}
        </div>
      )}
    </div>
  )
}

export default RequestTester