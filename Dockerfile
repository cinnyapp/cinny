## Builder
FROM node:20.12.2-alpine3.18 as builder

WORKDIR /src

COPY .npmrc package.json package-lock.json /src/
RUN npm ci
COPY . /src/
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm run build


## App
FROM nginx:1.27.0-alpine

COPY --from=builder /src/dist /app
COPY --from=builder /src/docker-nginx.conf /etc/nginx/conf.d/default.conf

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html
