FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code and build scripts
COPY scripts ./scripts
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose port (actual port set via PORT env variable)
EXPOSE 5000

# Start server
CMD ["npm", "start"]
