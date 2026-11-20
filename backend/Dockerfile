FROM node:20-alpine

WORKDIR /app

# Reproducible install; dependency lifecycle scripts are never executed.
COPY package*.json ./
COPY tsconfig.json ./
COPY scripts ./scripts
RUN npm ci --ignore-scripts

COPY src ./src

# Type-check + bundle
RUN npm run build

ENV NODE_ENV=production
# Run as the unprivileged "node" user shipped with the image.
RUN chown -R node:node /app
USER node

EXPOSE 3001
CMD ["npm", "start"]
