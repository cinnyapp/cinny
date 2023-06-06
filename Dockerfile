## Builder
FROM node:18.12.1-alpine3.15 as builder

WORKDIR /src

COPY .npmrc package.json package-lock.json /src/
RUN npm ci
COPY . /src/
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm run build


## App
FROM nginx:1.23.3-alpine

COPY --from=builder /src/dist /app

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html
