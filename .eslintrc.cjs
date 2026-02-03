module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["sonarjs"],
  rules: {
    "sonarjs/cognitive-complexity": ["warn", 15],
  },
  overrides: [
    {
      files: ["*.js", "*.cjs", "*.mjs"],
      parser: "espree",
    },
  ],
};
