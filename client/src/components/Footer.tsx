/**
 * MirageAPI - OpenAPI Mock Server
 * Copyright (c) 2024 Satya Bandaru. All rights reserved.
 * Licensed under the MIT License. See LICENSE file for details.
 */

import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer style={{
      flexShrink: 0,
      borderTop: '1px solid var(--border)',
      background: 'var(--surface2)',
      padding: '8px var(--spacing-lg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 11,
      color: 'var(--text3)',
      flexWrap: 'wrap',
      gap: 'var(--spacing-sm)'
    }} className="footer">
      {/* Left: Copyright */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto', minWidth: 0 }} className="footer-left">
        <span>© 2024 Satya Bandaru. All rights reserved.</span>
        <span style={{ color: 'var(--text3)', fontSize: 10 }} className="separator">•</span>
        <span>MirageAPI™</span>
      </div>

      {/* Right: Legal Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }} className="footer-right">
        <a
          href="https://github.com/venkatbandaru99/mirage/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--text3)',
            textDecoration: 'none',
            fontSize: 11,
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text2)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}
        >
          MIT License
        </a>
        <span style={{ color: 'var(--border2)', fontSize: 10 }}>•</span>
        <a
          href="https://github.com/venkatbandaru99/mirage"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--text3)',
            textDecoration: 'none',
            fontSize: 11,
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text2)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}
        >
          Source Code
        </a>
      </div>
    </footer>
  )
}

export default Footer