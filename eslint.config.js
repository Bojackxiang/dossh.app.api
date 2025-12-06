export default [
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-debugger": "warn",
      "no-var": "error",
      "prefer-const": "error",

      "arrow-spacing": ["error", { before: true, after: true }],
      "prefer-arrow-callback": "error",
      "prefer-template": "error",
      "template-curly-spacing": ["error", "never"],

      indent: ["error", 2, { SwitchCase: 1 }],
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      "comma-dangle": "off",
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],

      // 最佳实践
      eqeqeq: ["error", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-with": "error",
      "no-loop-func": "error",
      "no-new-func": "error",

      // async/await
      "require-await": "warn",
      "no-return-await": "error",

      // 导入规则
      "no-duplicate-imports": "error",
    },
  },
];
