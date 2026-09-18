# Ships with tsx at runtime rather than a tsc-compiled dist/ — a real
# production build would compile shared/ and server/ separately and rewire
# the cross-package "hookline-shared/src/*.js" imports to point at compiled
# output, which is real work with real ways to get subtly wrong. tsx (the
# same esbuild-based transpiler used in dev) is fast enough at this scale
# and is why it's in server's "dependencies", not "devDependencies" — it's
# not a dev tool here, it's what runs the app.
FROM node:22-slim AS base
WORKDIR /app

# Copy just the manifests first so `npm ci` is cached across builds that
# only change source, not dependencies.
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
RUN npm ci --workspace=hookline-shared --workspace=hookline-server --include-workspace-root

COPY shared/tsconfig.json shared/tsconfig.json
COPY shared/src shared/src
COPY server/tsconfig.json server/tsconfig.json
COPY server/src server/src

ENV NODE_ENV=production
EXPOSE 8080
# WORKDIR, not `npx tsx server/src/main.ts` from /app: tsx/esbuild resolve
# tsconfig.json (and its experimentalDecorators) starting from the current
# working directory, not from the entry file's own directory — running
# from repo root silently missed server/tsconfig.json and broke every
# parameter decorator in the app.
WORKDIR /app/server
CMD ["npx", "tsx", "src/main.ts"]
