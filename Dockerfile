# Used by MCP registries (e.g. Glama) to introspect the server. Real use is inside Termux on Android.
FROM node:22-alpine
WORKDIR /app
COPY bridge.mjs .
CMD ["node", "bridge.mjs", "--stdio"]
