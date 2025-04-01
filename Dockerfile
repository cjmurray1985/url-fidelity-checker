FROM mcr.microsoft.com/devcontainers/javascript-node:18

# Install Chromium for headless browser capabilities
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends chromium

# Install Playwright dependencies
RUN npx playwright install-deps chromium

# Set working directory
WORKDIR /workspace

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3000