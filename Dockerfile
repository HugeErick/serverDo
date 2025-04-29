# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code and config files
COPY src ./src
COPY tsconfig.json ./

# Build the TypeScript code
RUN pnpm run build

# Stage 2: Run the application
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install only production dependencies
RUN npm install -g pnpm

# Copy only necessary files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .

# Expose the port the app runs on
EXPOSE 3000

# Start the application (environment variables will be injected by Fly.io)
CMD ["node", "dist/server.js"]
