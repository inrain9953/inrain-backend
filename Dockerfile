FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=3031
EXPOSE 3031

CMD ["npm", "start"]
