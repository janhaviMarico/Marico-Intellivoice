# Use the official Node.js image as the base image
FROM node:16-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Build the Angular application
RUN npm run build

# Expose port 4200 for the Angular app
EXPOSE 4200

# Start the Angular application
CMD ["npm", "start"]
#CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "4200"]
