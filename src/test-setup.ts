import '@testing-library/jest-dom'

class ResizeObserverMock {
  callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    this.callback(
      [
        {
          borderBoxSize: [],
          contentBoxSize: [],
          contentRect: {
            width: 960,
            height: 320,
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            bottom: 320,
            right: 960,
            toJSON() {
              return {}
            },
          },
          devicePixelContentBoxSize: [],
          target,
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver
    )
  }
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock
