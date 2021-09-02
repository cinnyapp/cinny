## Builder
FROM node:14-alpine as builder

ENV default_server=matrix.org

WORKDIR /src

COPY . /src

RUN sed -i 's/value="matrix.org"/value="'$default_server'"/' /src/src/app/templates/auth/Auth.jsx

RUN npm install \
  && npm run build


## App
FROM nginx:alpine

COPY --from=builder /src/dist /app

# Insert wasm type into Nginx mime.types file so they load correctly.
RUN sed -i '3i\ \ \ \ application/wasm wasm\;' /etc/nginx/mime.types

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html