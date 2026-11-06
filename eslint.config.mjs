import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16 levererar flat config direkt – FlatCompat kraschar på den.
// Konfigurationen ignorerar redan .next/, out/, build/ och next-env.d.ts.
const eslintConfig = defineConfig([...nextVitals, ...nextTs]);

export default eslintConfig;
