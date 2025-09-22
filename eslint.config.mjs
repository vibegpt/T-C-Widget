import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  nextPlugin.configs["core-web-vitals"],
  {
    rules: {
      // 🔇 The ones Vercel complained about
      "@typescript-eslint/no-explicit-any": "off",
      "prefer-const": "off",
    },
  }
);
