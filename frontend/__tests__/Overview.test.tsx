import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Overview from '../components/dashboard/Overview'
import React from 'react'

// Mock global fetch to return an empty promise object structure for immediate unblocking
global.fetch = vi.fn().mockImplementation(() => new Promise(() => { }))

describe('Overview Component', () => {
    it('mounts and renders without crashing', () => {
        const { container } = render(<Overview />)
        expect(container).toBeInTheDocument()
        expect(container.firstChild).not.toBeNull()
    })
})
