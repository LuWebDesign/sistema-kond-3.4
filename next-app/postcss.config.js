module.exports = {
  plugins: {
    'postcss-preset-env': {
      stage: 1,
      autoprefixer: { grid: true },
      features: {
        'nesting-rules': true
      }
    }
  }
}