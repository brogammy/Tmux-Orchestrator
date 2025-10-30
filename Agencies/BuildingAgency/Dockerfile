# Build a container image for BuildingAgency
FROM node:18-slim

# Create app dir
WORKDIR /srv/app

# Copy package.json and lock for root to install shared deps
COPY package.json package-lock.json ./

# Install dependencies (only production)
RUN npm ci --only=production || true

# Copy the rest of the repository
COPY . /srv/app

# Ensure agency package.json is present and set workdir to agency
WORKDIR /srv/app/Agencies/BuildingAgency

# Expose a small health port
EXPOSE 4000

# Run the runner
CMD ["node", "runner.js"]
