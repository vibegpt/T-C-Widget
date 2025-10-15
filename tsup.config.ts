import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "legaleasy-loader.v1": "public/legaleasy-loader.js", // your vanilla file from Step 3
  },
  format: ["iife"],         // single global function
  globalName: "LegalEasy",  // window.LegalEasy
  minify: true,
  sourcemap: false,
  target: "es2018",
  clean: true,
  dts: false,
});
