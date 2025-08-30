// PostCSS configuration: run Tailwind (via the v4 PostCSS wrapper) and Autoprefixer
module.exports = {
	plugins: [
		require('@tailwindcss/postcss')(),
		require('autoprefixer')(),
	],
};
