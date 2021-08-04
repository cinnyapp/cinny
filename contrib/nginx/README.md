# nginx configuration

## Insert wasm type into nginx mime.types file so they load correctly.

`/etc/nginx/mime.types`:
```
types {
..
    application/wasm                      wasm;
..
}
```
