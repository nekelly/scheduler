FROM node:18-alpine

WORKDIR /app

# Install openssh-client for SSH execution mode
RUN apk add --no-cache openssh-client

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (will be overridden by docker-compose)
EXPOSE 3001

# Start application
CMD ["npm", "start"]
