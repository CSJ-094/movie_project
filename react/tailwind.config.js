/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'selector',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      gridTemplateColumns: { // 이 부분을 추가합니다.
        'auto-fill-minmax-250': 'repeat(auto-fill, minmax(250px, 1fr))', 
      }
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
  ],
}
