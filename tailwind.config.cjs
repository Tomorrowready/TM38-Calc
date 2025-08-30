/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  // Safelist ensures Tailwind generates utilities that may be constructed dynamically
  safelist: [
    // Common color utilities used across the app
    'bg-white', 'bg-black', 'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-700', 'bg-gray-600',
    'bg-indigo-600', 'bg-indigo-700', 'text-white', 'text-gray-700', 'text-gray-800', 'text-green-600', 'text-red-600',
    'border-gray-300', 'border-red-500', 'rounded-lg', 'rounded-md', 'font-bold', 'font-medium',
    // pattern-based safelists
    { pattern: /bg-(?:indigo|gray|green|red)-(?:50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-(?:gray|white|green|red|indigo)-(?:50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /hover:bg-(?:gray|indigo)-(?:50|100|200|300|400|500|600|700|800|900)/ },
  ],
  theme: {
    extend: {
      colors: {
        // Primary/brand indigo (used for buttons and highlights)
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          DEFAULT: '#4f46e5'
        },
        // Secondary/brand accent used across UI
        brand: {
          DEFAULT: '#646cff'
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f3f4f6',
          elevated: '#ffffff'
        },
        success: {
          DEFAULT: '#16A34A'
        },
        danger: {
          DEFAULT: '#DC2626'
        },
        muted: {
          DEFAULT: '#6B7280'
        }
      },
      spacing: {
        // Extra spacing tokens aligned to design rhythm
        '18': '4.5rem',
        '22': '5.5rem',
        '28': '7rem'
      },
      borderRadius: {
        // slightly larger rounded corners used across cards/buttons
        lg: '0.75rem'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif']
      }
    },
  },
  plugins: [],
}

