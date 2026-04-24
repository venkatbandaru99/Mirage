import React, { useState } from 'react'

interface ResponseViewerProps {
  response: {
    status: number
    statusText: string
    headers: Record<string, string>
    data: any
    responseTime: number
  }
}

const ResponseViewer: React.FC<ResponseViewerProps> = ({ response }) => {
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body')

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-700 bg-green-50'
    if (status >= 300 && status < 400) return 'text-blue-700 bg-blue-50'
    if (status >= 400 && status < 500) return 'text-orange-700 bg-orange-50'
    return 'text-red-700 bg-red-50'
  }

  const formatJSON = (data: any) => {
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  const syntaxHighlight = (json: string) => {
    // Simple syntax highlighting for JSON
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'text-gray-900'
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-blue-600 font-medium' // Keys
          } else {
            cls = 'text-green-600' // String values
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-purple-600' // Booleans
        } else if (/null/.test(match)) {
          cls = 'text-red-500' // Null
        } else if (/^-?\d/.test(match)) {
          cls = 'text-orange-600' // Numbers
        }
        return `<span class="${cls}">${match}</span>`
      }
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    })
  }

  const isJSON = (data: any) => {
    return typeof data === 'object' && data !== null
  }

  const formattedResponse = isJSON(response.data) 
    ? formatJSON(response.data)
    : String(response.data)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Response Status */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className={`px-2 py-1 text-sm font-medium rounded-full ${getStatusColor(response.status)}`}>
              {response.status} {response.statusText}
            </span>
            <span className="text-sm text-gray-600">
              {response.responseTime}ms
            </span>
          </div>
          
          <button
            onClick={() => copyToClipboard(formattedResponse)}
            className="text-gray-600 hover:text-gray-800 text-sm flex items-center space-x-1"
            title="Copy response"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Copy</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-100">
        <div className="flex">
          <button
            onClick={() => setActiveTab('body')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'body'
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Response Body
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'headers'
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Headers ({Object.keys(response.headers).length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white">
        {activeTab === 'body' ? (
          <div className="relative">
            {isJSON(response.data) ? (
              <pre 
                className="p-4 text-sm font-mono overflow-auto max-h-96 text-gray-900"
                style={{ lineHeight: '1.5' }}
                dangerouslySetInnerHTML={{
                  __html: syntaxHighlight(formattedResponse)
                }}
              />
            ) : (
              <div className="p-4 text-sm font-mono overflow-auto max-h-96 text-gray-900 whitespace-pre-wrap">
                {formattedResponse}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {Object.keys(response.headers).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(response.headers).map(([name, value]) => (
                  <div key={name} className="grid grid-cols-3 gap-4 text-sm">
                    <div className="font-medium text-gray-700 break-words">
                      {name}:
                    </div>
                    <div className="col-span-2 text-gray-900 break-words font-mono">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No headers received
              </div>
            )}
          </div>
        )}
      </div>

      {/* Size Info */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-xs text-gray-600">
        Size: {new Blob([formattedResponse]).size} bytes
        {isJSON(response.data) && (
          <span className="ml-4">
            Format: JSON
          </span>
        )}
      </div>
    </div>
  )
}

export default ResponseViewer