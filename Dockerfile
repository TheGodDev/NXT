FROM node:18-alpine

ENV NODE_ENV=production
ARG NPM_BUILD="npm install --omit=dev"
EXPOSE 8080/tcp

LABEL maintainer="Mercury Workshop"
LABEL summary="Scramjet Demo Image"
LABEL description="Example application of Scramjet"

WORKDIR /app

# 1. Copy package files
COPY ["package.json", "package-lock.json", "./"]

# 2. Install build tools
RUN apk add --upgrade --no-cache python3 make g++

# 3. Copy your folders and main HTML file before the installation
COPY src ./src
COPY public ./public
COPY index.html ./index.html

# 4. Run the install (the postinstall script can now find the src directory)
RUN $NPM_BUILD

# 5. Copy any remaining root files
COPY . .

ENTRYPOINT [ "node" ]
# Updated to point to the correct path inside the copied /src directory
CMD ["src/index.js"] 
