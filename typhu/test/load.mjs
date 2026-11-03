// nạp dữ liệu bàn cờ cho test Node
import { readFileSync } from 'fs';
import { setData } from '../js/engine.js?v=48';
const dir = new URL('..', import.meta.url);
setData(JSON.parse(readFileSync(new URL('tiles.json', dir))), JSON.parse(readFileSync(new URL('cards.json', dir))));
