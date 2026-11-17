FROM node:14
WORKDIR /usr/src/app
COPY package*.json .npmrc ./
RUN npm install
COPY . .
CMD node --unhandled-rejections=strict app.js