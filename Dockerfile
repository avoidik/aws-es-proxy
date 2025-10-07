FROM node:22-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies using npm ci for reproducible builds
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy app source
COPY . .

# Create non-root user and switch to it
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /usr/src/app
USER appuser

ENV NODE_ENV=production

EXPOSE 9200

# Use CMD instead of ENTRYPOINT to allow argument override
CMD ["node", "index.js"]
