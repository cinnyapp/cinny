# Cinny

## Table of Contents

- [About](#about)
- [Getting Started](https://cinny.in)
- [Contributing](./CONTRIBUTING.md)

## About <a name = "about"></a>

Cinny is a [Matrix](https://matrix.org) client focusing primarily on simple, elegant and secure interface.

## Building and Running

### Running pre-compiled

A pre-compiled version of the app exists in this repo. You can serve the application with a webserver of your choosing
by simply copying these files to the webroot:

  - `olm.wasm`
  - `_redirects`
  - all files in the `dist/` directory

### Building from source

Execute the following commands to compile the app from its source code:

```sh
npm install # Installs all dependencies
npm run build # Compiles the app into the dist/ directory
```

You can then copy the files to a webserver's webroot of your choosing as noted above. 
To serve a development version of the app locally for testing, you may also use the command `npm start`.

### Running with Docker

This repository includes a Dockerfile, which builds the application from source and serves it with Nginx on port 80. To
use this locally, you can build the container like so:

```
docker build -t cinny:latest .
```

You can then run the container you've built with a command similar to this:

```
docker run -p 8080:80 cinny:latest
```

This will forward your `localhost` port 8080 to the container's port 80. You can visit the app in your browser by
navigating to `http://localhost:8080`.


