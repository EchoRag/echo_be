FROM node:20-alpine

WORKDIR /usr/app

COPY package.json .

RUN npm i --production

COPY ./dist .

EXPOSE 3000

CMD ["node", "server.js"]