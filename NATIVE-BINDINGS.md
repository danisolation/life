# Post-install fix for npm optional-dependencies bug

npm has a known bug with optional native dependencies
(https://github.com/npm/cli/issues/4828) where platform-specific binaries
silently fail to extract. This project works around it with:

1. `.npmrc` containing `omit=optional` — prevents the broken code path.
2. Explicit platform binaries in devDependencies:
   - `@tailwindcss/oxide-linux-x64-gnu`
   - `lightningcss-linux-x64-gnu`
   - `@next/swc-linux-x64-gnu`
3. Native `.node` files copied where loaders expect them
   (npm normally nests optionals under the parent package):

   - `node_modules/@tailwindcss/oxide-linux-x64-gnu/tailwindcss-oxide.linux-x64-gnu.node`
     → `node_modules/@tailwindcss/oxide/`
   - `node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node`
     → `node_modules/lightningcss/`

## After any clean `npm install`, re-run:

```bash
./scripts/fix-native-bindings.sh
```

## Build with webpack (Turbopack has separate native-binding sandbox issues):

```bash
npx next build --webpack
npx next dev --webpack
```
