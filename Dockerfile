FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ .

RUN npx prisma generate

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js && node src/index.js"]
