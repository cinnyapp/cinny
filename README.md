# Cinny desktop

## Local development

To setup development locally run the following commands:
* `git clone --recursive https://github.com/cinnyapp/cinny-desktop.git`
* `cd cinny`
* `npm ci`
* `cd ..`
* `npm ci`

Now to build the app locally, run:
* `npm run tauri build`

To start local dev server, run:
* Open cinny submodule dir in terminal and run `npm start`
* Now main dir in another termial window run `npm run tauri dev`