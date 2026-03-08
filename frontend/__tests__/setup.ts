import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock global environment variables - MUST BE AT TOP
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString() },
        clear: () => { store = {} },
        removeItem: (key: string) => { delete store[key] },
    }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

import React from 'react'

vi.mock('recharts', async () => {
    const OriginalModule = await vi.importActual<any>('recharts')
    return {
        ...OriginalModule,
        ResponsiveContainer: ({ children }: any) => React.createElement('div', { style: { width: 800, height: 600 } }, children),
    }
})
