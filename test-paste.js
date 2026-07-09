const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.File = dom.window.File;
global.FileList = dom.window.FileList;
global.DataTransfer = dom.window.DataTransfer;
global.DataTransferItem = dom.window.DataTransferItem;

const { getFilesFromFileList, getDataTransferFiles } = require('./src/app/utils/dom.ts');
// Actually, it's typescript, so I can't just require it. I need to compile it or use ts-node.
