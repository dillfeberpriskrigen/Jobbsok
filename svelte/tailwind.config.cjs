/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{svelte,js,ts}",
    "./node_modules/@skeletonlabs/skeleton/**/*.{svelte,js,ts}"
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@skeletonlabs/skeleton/tailwind/skeleton.cjs')
  ],
};
