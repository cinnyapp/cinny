# Developing Cinny

> [!TIP]
> We recommend using a version manager as versions change very quickly.
> You will likely need to switch between multiple Node.js versions based
> on the needs of different projects you're working on. [NVM-windows]
> on Windows and [nvm] on Linux/macOS are pretty good choices. Recommended
> nodejs version is Krypton LTS (v24.13.1).

[nvm-windows]: https://github.com/coreybutler/nvm-windows#installation--upgrades
[nvm]: https://github.com/nvm-sh/nvm

Execute the following commands to start a development server:

```sh
npm ci # Installs all dependencies
npm start # Serve a development version
```

To build the app:

```sh
npm run build # Compiles the app into the dist/ directory
```

To commit changes:

```sh
npm run commit
```

## Running with Docker

This repository includes a Dockerfile, which builds the application from
source and serves it with Nginx on port 80. To use this locally, you can
build the container like so:

```
docker build -t cinny:latest .
```

You can then run the container you've built with a command similar to this:

```
docker run -p 8080:80 cinny:latest
```

This will forward your `localhost` port 8080 to the container's port 80.
You can visit the app in your browser by navigating to `http://localhost:8080`.

## Code formatting

We use [ESLint](https://eslint.org/) for clean and stylistically
consistent code syntax, so make sure your pull request follow it.

## Helpful links

- [BEM methodology](http://getbem.com/introduction/)
- [Atomic design](https://bradfrost.com/blog/post/atomic-web-design/)
- [Matrix JavaScript SDK documentation](https://matrix-org.github.io/matrix-js-sdk/index.html)
