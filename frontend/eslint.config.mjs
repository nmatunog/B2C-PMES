import next from "eslint-config-next";

/** Next App Router + `lib/` only — Vite `src/` is ignored for faster, focused lint. */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "src/**",
      "vite.config.js",
      "public/**",
    ],
  },
  ...next,
];

export default config;
