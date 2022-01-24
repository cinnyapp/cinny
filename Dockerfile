## Builder
FROM node:14-alpine as builder

WORKDIR /src

COPY package.json package-lock.json /src
RUN npm ci
COPY . /src
RUN npm run build


## App
FROM nginx:alpine

COPY --from=builder /src/dist /app

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html
