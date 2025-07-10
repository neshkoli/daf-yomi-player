/**
 * Test setup file for Daf Yomi Player
 * Configures global mocks and test environment
 */

// Mock DOM elements that might not be available in Node.js
global.document = {
  getElementById: jest.fn(),
  createElement: jest.fn((tagName) => ({
    tagName: tagName.toUpperCase(),
    appendChild: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn()
    },
    style: {},
    innerHTML: '',
    textContent: '',
    value: '',
    disabled: false,
    src: '',
    currentTime: 0,
    duration: 0,
    paused: true,
    play: jest.fn(),
    pause: jest.fn(),
    load: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn()
  })),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Mock window object
global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: {
    href: 'http://localhost:8080',
    origin: 'http://localhost:8080',
    pathname: '/'
  },
  history: {
    pushState: jest.fn(),
    replaceState: jest.fn()
  },
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  sessionStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  }
};

// Mock fetch API
global.fetch = jest.fn();

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock setTimeout and clearTimeout
global.setTimeout = jest.fn((callback, delay) => {
  return 1; // Return a mock timer ID
});

global.clearTimeout = jest.fn((id) => {
  // Mock clearTimeout
});

// Mock Audio API
global.Audio = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  load: jest.fn(),
  currentTime: 0,
  duration: 0,
  src: '',
  paused: true,
  volume: 1,
  muted: false
}));

// Mock HTML elements
global.HTMLAudioElement = jest.fn();
global.HTMLButtonElement = jest.fn();
global.HTMLSelectElement = jest.fn();
global.HTMLElement = jest.fn();

// Mock Event
global.Event = jest.fn().mockImplementation((type, options = {}) => ({
  type,
  target: options.target || null,
  currentTarget: options.currentTarget || null,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn()
}));

// Mock CustomEvent
global.CustomEvent = jest.fn().mockImplementation((type, options = {}) => ({
  type,
  detail: options.detail || {},
  target: options.target || null,
  currentTarget: options.currentTarget || null,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn()
}));

// Mock URL API
global.URL = {
  createObjectURL: jest.fn(),
  revokeObjectURL: jest.fn()
};

// Mock File API
global.File = jest.fn();
global.FileReader = jest.fn();

// Mock Blob API
global.Blob = jest.fn();

// Mock FormData
global.FormData = jest.fn();

// Mock Headers
global.Headers = jest.fn();

// Mock Request
global.Request = jest.fn();

// Mock Response
global.Response = jest.fn();

// Mock AbortController
global.AbortController = jest.fn().mockImplementation(() => ({
  signal: {},
  abort: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock Performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => [])
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return 1; // Return a mock frame ID
});

// Mock cancelAnimationFrame
global.cancelAnimationFrame = jest.fn((id) => {
  // Mock cancelAnimationFrame
});

// Mock matchMedia
global.matchMedia = jest.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn()
}));

// Mock getComputedStyle
global.getComputedStyle = jest.fn().mockImplementation(() => ({
  getPropertyValue: jest.fn(() => ''),
  setProperty: jest.fn()
}));

// Mock createElement for specific elements
document.createElement.mockImplementation((tagName) => {
  const element = {
    tagName: tagName.toUpperCase(),
    appendChild: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn()
    },
    style: {},
    innerHTML: '',
    textContent: '',
    value: '',
    disabled: false,
    src: '',
    currentTime: 0,
    duration: 0,
    paused: true,
    play: jest.fn(),
    pause: jest.fn(),
    load: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    click: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    hasAttribute: jest.fn(),
    cloneNode: jest.fn(() => element)
  };
  
  // Special handling for audio elements
  if (tagName.toLowerCase() === 'audio') {
    element.volume = 1;
    element.muted = false;
    element.autoplay = false;
    element.controls = false;
    element.preload = 'none';
  }
  
  // Special handling for button elements
  if (tagName.toLowerCase() === 'button') {
    element.type = 'button';
    element.disabled = false;
  }
  
  // Special handling for select elements
  if (tagName.toLowerCase() === 'select') {
    element.options = [];
    element.selectedIndex = -1;
    element.multiple = false;
  }
  
  return element;
});

// Mock getElementById with specific elements
document.getElementById.mockImplementation((id) => {
  const elements = {
    'tractate-select': {
      value: '',
      addEventListener: jest.fn(),
      appendChild: jest.fn(),
      innerHTML: '',
      disabled: false,
      options: [],
      selectedIndex: -1
    },
    'daf-select': {
      value: '',
      addEventListener: jest.fn(),
      appendChild: jest.fn(),
      innerHTML: '',
      disabled: true,
      options: [],
      selectedIndex: -1
    },
    'play-pause-btn': {
      addEventListener: jest.fn(),
      innerHTML: '<i class="fas fa-play"></i>',
      disabled: false,
      classList: { add: jest.fn(), remove: jest.fn() },
      querySelector: jest.fn(() => ({ className: 'fas fa-play' }))
    },
    'prev-btn': {
      addEventListener: jest.fn(),
      disabled: false,
      classList: { add: jest.fn(), remove: jest.fn() }
    },
    'next-btn': {
      addEventListener: jest.fn(),
      disabled: false,
      classList: { add: jest.fn(), remove: jest.fn() }
    },
    'loading': {
      style: { display: 'none' }
    },
    'text-section': {
      style: { display: 'block' }
    },
    'text-loading': {
      style: { display: 'none' }
    },
    'text-content': {
      innerHTML: '',
      style: { display: 'block' },
      appendChild: jest.fn()
    },
    'hebrew-btn': {
      addEventListener: jest.fn(),
      classList: { add: jest.fn(), remove: jest.fn() }
    },
    'english-btn': {
      addEventListener: jest.fn(),
      classList: { add: jest.fn(), remove: jest.fn() }
    },
    'audio-player': {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      pause: jest.fn(),
      play: jest.fn(),
      load: jest.fn(),
      currentTime: 0,
      duration: 0,
      src: '',
      paused: true,
      volume: 1,
      muted: false
    }
  };
  
  return elements[id] || {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    innerHTML: '',
    style: {},
    classList: { add: jest.fn(), remove: jest.fn() }
  };
});

// Setup global test utilities
global.testUtils = {
  // Helper to create a mock event
  createMockEvent: (type, options = {}) => {
    return new Event(type, options);
  },
  
  // Helper to simulate user interaction
  simulateUserInteraction: (element, eventType, options = {}) => {
    const event = new Event(eventType, options);
    if (element.addEventListener) {
      const listeners = element.addEventListener.mock.calls
        .filter(call => call[0] === eventType)
        .map(call => call[1]);
      
      listeners.forEach(listener => listener(event));
    }
  },
  
  // Helper to wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create mock audio data
  createMockAudioData: () => ({
    "BavaBatra": ["2", "3", "4", "5"],
    "BavaKamma": ["2", "3", "4", "5", "6"],
    "Berakhot": ["2", "3", "4"]
  }),
  
  // Helper to create mock masechet data
  createMockMasechetData: () => [
    { order: 1, title: "Berakhot", heTitle: "ברכות" },
    { order: 20, title: "BavaKamma", heTitle: "בבא קמא" },
    { order: 22, title: "BavaBatra", heTitle: "בבא בתרא" }
  ]
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset fetch mock
  fetch.mockReset();
  
  // Reset document.getElementById mock
  document.getElementById.mockClear();
  
  // Reset console mocks
  console.log.mockClear();
  console.error.mockClear();
  console.warn.mockClear();
}); 