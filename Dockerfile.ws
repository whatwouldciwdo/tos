FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY ws-server.js ./

EXPOSE 3001

ENV PORT_WS 3001
ENV HOST 0.0.0.0

CMD ["node", "ws-server.js"]
 
