# 1. Use Node 22 Alpine to support modern dependency engines
FROM node:22-alpine

# 2. Setup the application container workspace directory
WORKDIR /app

# 3. Copy application manifest structures first for caching optimization
COPY package.json ./

# 4. Install native compilation tools required by Scramjet/Libcurl transport layers
RUN apk add --no-cache python3 make g++ 

# 5. Execute a clean, production-only dependency installation
RUN npm install --omit=dev

# 6. Explicitly copy your sub-directories from the repository scaffold
COPY proxy ./proxy
COPY scramjet ./scramjet
COPY src ./src

# 7. Explicitly copy your system core source engine and configuration files
COPY server.js ./server.js
COPY config.js ./config.js
COPY firebase-config.js ./firebase-config.js
COPY script.js ./script.js
COPY telemetry.js ./telemetry.js
COPY dashboard.js ./dashboard.js

# 8. Explicitly copy your static entry point views
COPY index.html ./index.html
COPY admin.html ./admin.html
COPY user.html ./user.html

# 9. Open Render's routing interface traffic gateway port
EXPOSE 10000

# 10. Spin up the cluster using your customized package start execution command
CMD ["npm", "start"]
