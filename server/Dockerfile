# Stage 1: Build the Node.js application
FROM node:20 AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application (if applicable)
RUN npm run build # Adjust this if you have a specific build command

# Stage 2: Run the Node.js application
FROM node:20 AS runtime

# Set the working directory for runtime
WORKDIR /app

# Copy only necessary files from builder stage
COPY --from=builder /app ./

# Expose port for the app
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
