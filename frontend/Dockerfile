FROM node:18-alpine

# Set work directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app files
COPY . .

# Build the app for production
RUN npm run build || true

EXPOSE 3000

CMD ["npm", "start"]