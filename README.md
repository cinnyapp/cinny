# Cinny

## Table of Contents

- [About](#about)
- [Getting Started](https://cinny.in)
- [Contributing](./CONTRIBUTING.md)
- [Roadmap](https://github.com/ajbura/cinny/projects/11)

## About <a name = "about"></a>

Cinny is a [Matrix](https://matrix.org) client focusing primarily on simple, elegant and secure interface.

![preview](https://github.com/ajbura/cinny-site/blob/master/assets/preview-light.png)

## Building and Running

### Running pre-compiled

A tarball of pre-compiled version of the app is provided with each [release](https://github.com/ajbura/cinny/releases).
You can serve the application with a webserver of your choosing by simply copying `dist/` directory to the webroot.

### Building from source

Execute the following commands to compile the app from its source code:

```sh
npm ci # Installs all dependencies
npm run build # Compiles the app into the dist/ directory
```

You can then copy the files to a webserver's webroot of your choice.

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

Alternatively you can just pull the [DockerHub image](https://hub.docker.com/r/ajbura/cinny) by `docker pull ajbura/cinny`.

### Configuring default Homeserver

To set default Homeserver on login and register page, place a customized [`config.json`](config.json) in webroot of your choice.

## License

Copyright (c) 2021 Ajay Bura (ajbura) and contributors

Code licensed under the MIT License: <http://opensource.org/licenses/MIT>

Graphics licensed under CC-BY 4.0: <https://creativecommons.org/licenses/by/4.0/>
