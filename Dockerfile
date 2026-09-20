FROM node:22-alpine

WORKDIR /app

# 1. Copy config manifests
COPY package.json ./

# 2. Pull down build tools for Scramjet's native bindings
RUN apk add --no-cache python3 make g++ 

# 3. Clean install production tracks
RUN npm install --omit=dev

# 4. Copy folders
COPY src ./src
COPY proxy ./proxy
COPY scramjet ./scramjet

# 5. Copy ALL crucial root files required for your application to run
COPY server.js ./server.js
COPY config.js ./config.js
COPY auth.js ./auth.js
COPY firebase-config.js ./firebase-config.js
COPY index.html ./index.html

EXPOSE 10000

# 6. Execute the launcher script mapping
CMD ["npm", "start"]
