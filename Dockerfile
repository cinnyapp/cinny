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

# Insert wasm type into Nginx mime.types file so they load correctly.
RUN sed -i '3i\ \ \ \ application/wasm wasm\;' /etc/nginx/mime.types

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html
