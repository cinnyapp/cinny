## Builder
FROM node:14-alpine as builder

WORKDIR /src

COPY . /src
RUN npm install \
  && npm run build


## App
FROM nginx:alpine

COPY --from=builder /src/dist /app
COPY --from=builder /src/olm.wasm /app/olm.wasm
COPY --from=builder /src/_redirects /app/_redirects

# Insert wasm type into Nginx mime.types file so they load correctly.
RUN sed -i '3i\ \ \ \ application/wasm wasm\;' /etc/nginx/mime.types

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html
