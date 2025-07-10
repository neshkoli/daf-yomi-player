module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    // Error prevention
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-console': 'warn',
    
    // Code style
    'indent': ['error', 4],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    
    // Best practices
    'prefer-const': 'error',
    'no-var': 'error',
    'no-redeclare': 'error',
    'no-unreachable': 'error',
    
    // ES6+ features
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    'prefer-template': 'error',
    
    // Async/await
    'no-async-promise-executor': 'error',
    'require-await': 'warn',
    
    // Object and array
    'object-shorthand': 'error',
    'prefer-destructuring': ['error', {
      array: false,
      object: true
    }],
    
    // Functions
    'func-style': ['error', 'expression'],
    'no-loop-func': 'error',
    
    // Comments
    'spaced-comment': ['error', 'always'],
    
    // Whitespace
    'no-multiple-empty-lines': ['error', { max: 2 }],
    'no-mixed-spaces-and-tabs': 'error',
    
    // Variables
    'no-use-before-define': 'error',
    'no-shadow': 'error',
    
    // Control flow
    'no-else-return': 'error',
    'no-empty': 'error',
    'no-extra-semi': 'error',
    
    // Strings
    'no-useless-escape': 'error',
    'prefer-regex-literals': 'error',
    
    // Numbers
    'no-magic-numbers': ['warn', { ignore: [0, 1, -1] }],
    
    // Classes
    'class-methods-use-this': 'warn',
    'no-dupe-class-members': 'error',
    
    // Modules
    'no-duplicate-exports': 'error',
    
    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error'
  },
  globals: {
    // Browser globals
    'window': 'readonly',
    'document': 'readonly',
    'navigator': 'readonly',
    'console': 'readonly',
    'fetch': 'readonly',
    'Audio': 'readonly',
    'Event': 'readonly',
    'CustomEvent': 'readonly',
    'URL': 'readonly',
    'File': 'readonly',
    'FileReader': 'readonly',
    'Blob': 'readonly',
    'FormData': 'readonly',
    'Headers': 'readonly',
    'Request': 'readonly',
    'Response': 'readonly',
    'AbortController': 'readonly',
    'IntersectionObserver': 'readonly',
    'ResizeObserver': 'readonly',
    'performance': 'readonly',
    'requestAnimationFrame': 'readonly',
    'cancelAnimationFrame': 'readonly',
    'matchMedia': 'readonly',
    'getComputedStyle': 'readonly',
    'setTimeout': 'readonly',
    'clearTimeout': 'readonly',
    'setInterval': 'readonly',
    'clearInterval': 'readonly',
    
    // Node.js globals
    'process': 'readonly',
    'Buffer': 'readonly',
    '__dirname': 'readonly',
    '__filename': 'readonly',
    'module': 'readonly',
    'require': 'readonly',
    'exports': 'readonly',
    'global': 'readonly',
    
    // Test globals
    'describe': 'readonly',
    'test': 'readonly',
    'it': 'readonly',
    'expect': 'readonly',
    'beforeEach': 'readonly',
    'afterEach': 'readonly',
    'beforeAll': 'readonly',
    'afterAll': 'readonly',
    'jest': 'readonly'
  },
  overrides: [
    {
      // Test files
      files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off',
        'no-magic-numbers': 'off'
      }
    },
    {
      // Build and utility scripts
      files: ['build.js', 'validate-content.js', 'utils/**/*.js'],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off'
      }
    }
  ]
}; 