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
- [Roadmap](https://github.com/orgs/cinnyapp/projects/1)
- [Contributing](./CONTRIBUTING.md)

<img align="center" src="https://raw.githubusercontent.com/cinnyapp/cinny-site/main/assets/preview2-light.png" height="380">

## Getting started
* Web app is available at https://app.cinny.in and gets updated on each new release. The `dev` branch is continuously deployed at https://dev.cinny.in but keep in mind that it could have things broken.

* You can also download our desktop app from [cinny-desktop repository](https://github.com/cinnyapp/cinny-desktop).

* To host Cinny on your own, download tarball of the app from [GitHub release](https://github.com/cinnyapp/cinny/releases/latest).
You can serve the application with a webserver of your choice by simply copying `dist/` directory to the webroot. 
To set default Homeserver on login, register and Explore Community page, place a customized [`config.json`](config.json) in webroot of your choice.
You will also need to setup redirects to serve the assests. An example setting of redirects for netlify is done in [`netlify.toml`](netlify.toml). You can also set `hashRouter.enabled = true` in [`config.json`](config.json) if you have trouble setting redirects.
To deploy on subdirectory, you need to rebuild the app youself after updating the `base` path in [`build.config.ts`](build.config.ts). For example, if you want to deploy on `https://cinny.in/app`, then change `base: '/app'`.

* Alternatively you can just pull the [DockerHub image](https://hub.docker.com/r/ajbura/cinny) by:
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
mxFo+ioe/ABCufSmyqFye0psX3Sp
=WtqZ
-----END PGP PUBLIC KEY BLOCK-----
```
</details>

## Local development
> We recommend using a version manager as versions change very quickly. You will likely need to switch 
between multiple Node.js versions based on the needs of different projects you're working on. [NVM on windows](https://github.com/coreybutler/nvm-windows#installation--upgrades) on Windows and [nvm](https://github.com/nvm-sh/nvm) on Linux/macOS are pretty good choices. Recommended nodejs version is Iron LTS (v20).

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
