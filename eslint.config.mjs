import nextConfig from 'eslint-config-next'

const config = [
  {
    ignores: [
      '.next/**',
      '.netlify/**',
      'node_modules/**',
      'netlify/functions-internal/**',
    ],
  },
  ...nextConfig,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]

export default config
