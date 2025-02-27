# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first (for caching layers)
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy only the compiled files (not /src)
COPY dist ./dist

# Expose port
EXPOSE 5000

# Start the app
CMD ["node", "dist/server.js"]
