# 1. Use the Node version specified in your package.json
FROM node:20-alpine

# 2. Create and set the working directory
WORKDIR /app

# 3. Copy package configuration first (ignoring the missing lockfile)
COPY package.json ./

# 4. Install build dependencies needed for certain proxy native modules
RUN apk add --no-cache python3 make g++ 

# 5. Install production dependencies only
RUN npm install --omit=dev

# 6. Copy the rest of your application code
COPY src ./src
COPY proxy ./proxy
COPY index.html ./index.html
COPY . .

# 7. Expose the port your server listens on (Render uses 10000 by default)
EXPOSE 10000

# 8. Start the application using your npm script
CMD ["npm", "start"]
