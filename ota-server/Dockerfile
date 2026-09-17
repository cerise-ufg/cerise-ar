FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
ENV DATA_DIR=/data
ENV PORT=3000
ENV PUBLIC_BASE=https://cerise.wenfur.com.br/updates
EXPOSE 3000
CMD ["node", "server.js"]
