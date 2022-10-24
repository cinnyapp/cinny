## Builder
FROM node:17.9.0-alpine3.15 as builder

WORKDIR /src

COPY .npmrc package.json package-lock.json /src/
RUN npm ci
COPY . /src/
RUN npm run build


## App
FROM nginx:1.23.2-alpine

COPY --from=builder /src/dist /app

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html
