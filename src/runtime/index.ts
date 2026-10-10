import { injectNetworkHooks } from "./network.js";

const assetsMap = (window as any).__assetsMap__ || {};
const baseUrl = location.href;

injectNetworkHooks(assetsMap, baseUrl);