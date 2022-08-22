# Cinny
<p>
    <a href="https://github.com/ajbura/cinny/releases">
        <img alt="GitHub release downloads" src="https://img.shields.io/github/downloads/ajbura/cinny/total?logo=github&style=social"></a>
    <a href="https://hub.docker.com/r/ajbura/cinny">
        <img alt="DockerHub downloads" src="https://img.shields.io/docker/pulls/ajbura/cinny?logo=docker&style=social"></a>
    <a href="https://fosstodon.org/@cinnyapp">
        <img alt="Follow on Mastodon" src="https://img.shields.io/mastodon/follow/106845779685925461?domain=https%3A%2F%2Ffosstodon.org&logo=mastodon&style=social"></a>
    <a href="https://twitter.com/intent/follow?screen_name=cinnyapp">
        <img alt="Follow on Twitter" src="https://img.shields.io/twitter/follow/cinnyapp?logo=twitter&style=social"></a>
    <a href="https://cinny.in/#sponsor">
        <img alt="Sponsor Cinny" src="https://img.shields.io/opencollective/all/cinny?logo=opencollective&style=social"></a>
</p>

A Matrix client focusing primarily on simple, elegant and secure interface. The main goal is to have an instant messaging application that is easy on people and has a modern touch.
- [Roadmap](https://github.com/ajbura/cinny/projects/11)
- [Contributing](./CONTRIBUTING.md)

## Getting started
Web app is available at https://app.cinny.in and gets updated on each new release. The `dev` branch is continuously deployed at https://dev.cinny.in but keep in mind that it could have things broken.

You can also download our desktop app from [cinny-desktop repository](https://github.com/cinnyapp/cinny-desktop).

To host Cinny on your own, download tarball of the app from [GitHub release](https://github.com/cinnyapp/cinny/releases/latest).
You can serve the application with a webserver of your choice by simply copying `dist/` directory to the webroot. 
To set default Homeserver on login and register page, place a customized [`config.json`](config.json) in webroot of your choice.

Alternatively you can just pull the [DockerHub image](https://hub.docker.com/r/ajbura/cinny) by:
```
docker pull ajbura/cinny
```
or [ghcr image](https://github.com/cinnyapp/cinny/pkgs/container/cinny) by:
```
docker pull ghcr.io/cinnyapp/cinny:latest
```

<details>
<summary>PGP Public Key to verify tarball</summary>

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

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
UeGsouhyuITLwEhScounZDqop+Dx
=Zg+6
-----END PGP PUBLIC KEY BLOCK-----
```
</details>

## Local development
> We recommend using a version manager as versions change very quickly. You will likely need to switch 
between multiple Node.js versions based on the needs of different projects you're working on. [NVM on windows](https://github.com/coreybutler/nvm-windows#installation--upgrades) on Windows and [nvm](https://github.com/nvm-sh/nvm) on Linux/macOS are pretty good choices. Also recommended nodejs version is 16.15.0 LTS.

Execute the following commands to start a development server:
```sh
npm ci # Installs all dependencies
npm start # Serve a development version
```

To build the app:
```sh
npm run build # Compiles the app into the dist/ directory
```

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

This will forward your `localhost` port 8080 to the container's port 80. You can visit the app in your browser by navigating to `http://localhost:8080`.


## License

Copyright (c) 2021-present Ajay Bura (ajbura)

Code licensed under the MIT License: <http://opensource.org/licenses/MIT>

Graphics licensed under CC-BY 4.0: <https://creativecommons.org/licenses/by/4.0/>
