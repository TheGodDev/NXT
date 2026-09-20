# Upgrade from node:20 to node:22 to support your dependency engine rules
FROM node:22-alpine

WORKDIR /app

COPY package.json ./

RUN apk add --no-cache python3 make g++ 

RUN npm install --omit=dev

COPY src ./src
COPY proxy ./proxy
COPY index.html ./index.html
COPY . .

EXPOSE 10000

CMD ["npm", "start"]
