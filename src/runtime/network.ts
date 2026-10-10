import { dataURItoBlobSync } from "../utility/utility.js";
import { resolveVirtualPath } from "./path.js";

export function injectNetworkHooks(assetsMap: Record<string,string>, baseUrl: string) {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        const normalizedUrl = resolveVirtualPath(url, baseUrl);
        if (assetsMap[normalizedUrl]) {
            return new Response(dataURItoBlobSync(assetsMap[normalizedUrl]), {
                status: 200
            });
        }
        else {
            return originalFetch(input, init);
        }
    };
    
    const OriginalXHR = window.XMLHttpRequest;
    (window as any).XMLHttpRequest = class FakeXHR extends OriginalXHR {
        private _fakeUrl?: string;

        override open(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
            const stringUrl = url instanceof URL ? url.href : String(url);
            const normalizedUrl = resolveVirtualPath(stringUrl, baseUrl);

            if (assetsMap[normalizedUrl]) {
                this._fakeUrl = normalizedUrl;
            } else {
                if (async !== undefined) {
                    super.open(method, url, async, username, password);
                } else {
                    super.open(method, url);
                }
            }
        }

        override send(body?: Document | XMLHttpRequestBodyInit | null) {
            if (this._fakeUrl) {
                const dataURI = assetsMap[this._fakeUrl];
                if (!dataURI) return;
                const blob = dataURItoBlobSync(dataURI);

                const setupResponse = (data: any, text?: string) => {
                    Object.defineProperty(this, 'status', { value: 200, writable: true });
                    Object.defineProperty(this, 'readyState', { value: 4, writable: true });
                    Object.defineProperty(this, 'response', { value: data, writable: true });
                    if (text !== undefined) {
                        Object.defineProperty(this, 'responseText', { value: text, writable: true });
                    }
                    if (typeof this.onload === 'function') {
                        this.onload(new ProgressEvent('load'));
                    }
                };

                if (this.responseType === 'arraybuffer') {
                    blob.arrayBuffer().then(buffer => setupResponse(buffer));
                } else if (this.responseType === 'json') {
                    blob.text().then(text => {
                        let json = null;
                        try { json = JSON.parse(text); } catch (e) {}
                        setupResponse(json);
                    });
                } else {
                    // default to text or ''
                    blob.text().then(text => setupResponse(text, text));
                }
            } else {
                super.send(body);
            }
        }
    };

    // DOM hooks to intercept dynamic elements like <script src="..."> or <img src="...">
    const interceptSrc = (proto: any) => {
        const desc = Object.getOwnPropertyDescriptor(proto, 'src');
        if (desc && desc.set) {
            Object.defineProperty(proto, 'src', {
                set: function(val: string) {
                    const normalizedUrl = resolveVirtualPath(String(val), baseUrl);
                    if (assetsMap[normalizedUrl]) {
                        desc.set!.call(this, assetsMap[normalizedUrl]);
                    } else {
                        desc.set!.call(this, val);
                    }
                },
                get: function() {
                    return desc.get?.call(this);
                }
            });
        }
    };

    if (typeof HTMLScriptElement !== 'undefined') interceptSrc(HTMLScriptElement.prototype);
    if (typeof HTMLImageElement !== 'undefined') interceptSrc(HTMLImageElement.prototype);
    if (typeof HTMLAudioElement !== 'undefined') interceptSrc(HTMLAudioElement.prototype);
    if (typeof HTMLVideoElement !== 'undefined') interceptSrc(HTMLVideoElement.prototype);
    if (typeof HTMLSourceElement !== 'undefined') interceptSrc(HTMLSourceElement.prototype);

    if (typeof Element !== 'undefined') {
        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name: string, value: string) {
            if (name.toLowerCase() === 'src' || name.toLowerCase() === 'href') {
                const normalizedUrl = resolveVirtualPath(String(value), baseUrl);
                if (assetsMap[normalizedUrl]) {
                    return originalSetAttribute.call(this, name, assetsMap[normalizedUrl]);
                }
            }
            return originalSetAttribute.call(this, name, value);
        };
    }

    // Hook FontFace API for fonts loaded dynamically
    if (typeof (window as any).FontFace !== 'undefined') {
        const OriginalFontFace = (window as any).FontFace;
        (window as any).FontFace = function(family: string, source: string | ArrayBuffer, descriptors?: any) {
            if (typeof source === 'string') {
                source = source.replace(/url\(['"]?(.*?)['"]?\)/g, (match, url) => {
                    const normalizedUrl = resolveVirtualPath(url, baseUrl);
                    if (assetsMap[normalizedUrl]) {
                        return `url('${assetsMap[normalizedUrl]}')`;
                    }
                    return match;
                });
            }
            return new OriginalFontFace(family, source, descriptors);
        };
        (window as any).FontFace.prototype = OriginalFontFace.prototype;
    }

    // Hook style tag text injection for CSS-based font loading
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName: string, options?: ElementCreationOptions) {
        const el = originalCreateElement.call(this, tagName, options);
        if (tagName.toLowerCase() === 'style') {
            const interceptStyleText = (text: string) => {
                return text.replace(/url\(['"]?(.*?)['"]?\)/g, (match, url) => {
                    const normalizedUrl = resolveVirtualPath(url, baseUrl);
                    if (assetsMap[normalizedUrl]) {
                        return `url('${assetsMap[normalizedUrl]}')`;
                    }
                    return match;
                });
            };

            const originalAppendChild = el.appendChild;
            el.appendChild = function<T extends Node>(node: T): T {
                if (node.nodeType === 3 && node.nodeValue) { // Node.TEXT_NODE
                    node.nodeValue = interceptStyleText(node.nodeValue);
                }
                return originalAppendChild.call(this, node) as T;
            };

            const textContentDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
            if (textContentDesc && textContentDesc.set) {
                Object.defineProperty(el, 'textContent', {
                    set: function(val: string) {
                        textContentDesc.set!.call(this, interceptStyleText(val));
                    },
                    get: function() {
                        return textContentDesc.get!.call(this);
                    }
                });
            }

            const innerHTMLDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
            if (innerHTMLDesc && innerHTMLDesc.set) {
                Object.defineProperty(el, 'innerHTML', {
                    set: function(val: string) {
                        innerHTMLDesc.set!.call(this, interceptStyleText(val));
                    },
                    get: function() {
                        return innerHTMLDesc.get!.call(this);
                    }
                });
            }
        }
        return el;
    };
}