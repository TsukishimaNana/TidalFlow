import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../src/renderer/src/components/ErrorBoundary'

// Component that throws
function Thrower({ message }: { message?: string }) {
  throw new Error(message ?? 'test error')
}

// Normal component
function SafeChild() {
  return <div>All good</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>
    )

    expect(screen.getByText('All good')).toBeDefined()
  })

  it('shows error UI when child throws', () => {
    // Suppress React's error boundary logging in test output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeDefined()
    expect(screen.getByText('test error')).toBeDefined()
    expect(screen.getByText('Reload')).toBeDefined()

    spy.mockRestore()
  })

  it('shows custom error message from thrown Error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Thrower message="Database connection lost" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Database connection lost')).toBeDefined()

    spy.mockRestore()
  })

  it('shows Show Details button when error has stack trace', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Thrower message="something broke" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Show Details')).toBeDefined()

    spy.mockRestore()
  })

  it('toggles details when Show/Hide Details is clicked', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container } = render(
      <ErrorBoundary>
        <Thrower message="details test" />
      </ErrorBoundary>
    )

    // Click Show Details
    const showBtn = screen.getByText('Show Details')
    showBtn.click()

    // Should now show pre element with stack
    const pre = container.querySelector('pre')
    expect(pre).not.toBeNull()

    // Click Hide Details
    const hideBtn = screen.getByText('Hide Details')
    hideBtn.click()

    // Pre should be gone
    expect(container.querySelector('pre')).toBeNull()

    spy.mockRestore()
  })
})
