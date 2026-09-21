FROM node:18-alpine

ENV NODE_ENV=production
# Force Fastify/Node to fall back on port 10000 to match Render's environment
ENV PORT=10000 
ARG NPM_BUILD="npm install --omit=dev"

# Expose Render's standard container port allocation
EXPOSE 10000/tcp

LABEL maintainer="Mercury Workshop"
LABEL summary="Scramjet Demo Image"
LABEL description="Example application of Scramjet"

WORKDIR /app

# 1. Copy package files
COPY ["package.json", "package-lock.json", "./"]

# 2. Install build tools (Required for native proxy transport compilation)
RUN apk add --upgrade --no-cache python3 make g++

# 3. Copy your folders and main HTML file before the installation
COPY src ./src
COPY proxy ./proxy
COPY index.html ./index.html

# 4. Run the install (the postinstall script can now find the src directory)
RUN $NPM_BUILD

# 5. Copy any remaining root files
COPY . .

ENTRYPOINT [ "node" ]
CMD ["src/index.js"]
