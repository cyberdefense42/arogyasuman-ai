# Multi-stage production Dockerfile for HealthScan AI Backend

# Stage 1: Dependencies and build
FROM node:18-alpine AS builder

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S healthscan -u 1001

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Stage 2: Production runtime
FROM node:18-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S healthscan -u 1001

# Install runtime dependencies
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype \
    dumb-init

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=healthscan:nodejs /app/dist ./dist
COPY --from=builder --chown=healthscan:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=healthscan:nodejs /app/prisma ./prisma
COPY --from=builder --chown=healthscan:nodejs /app/package*.json ./

# Create directories for logs and uploads
RUN mkdir -p logs uploads/reports uploads/temp && \
    chown -R healthscan:nodejs logs uploads

# Security: Set file permissions
RUN chmod -R 755 /app && \
    chmod -R 750 logs uploads

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => { \
        process.exit(res.statusCode === 200 ? 0 : 1) \
    }).on('error', () => process.exit(1))"

# Security: Switch to non-root user
USER healthscan

# Expose port
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]

# Labels for metadata
LABEL maintainer="HealthScan AI Team" \
      version="1.0.0" \
      description="HealthScan AI Backend API" \
      security.scan="enabled"