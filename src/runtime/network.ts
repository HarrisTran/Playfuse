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

    const domClasses = [
        typeof HTMLScriptElement !== 'undefined' ? HTMLScriptElement : null,
        typeof HTMLImageElement !== 'undefined' ? HTMLImageElement : null,
        typeof HTMLMediaElement !== 'undefined' ? HTMLMediaElement : null,
        typeof HTMLSourceElement !== 'undefined' ? HTMLSourceElement : null,
    ];
    for (const cls of domClasses) {
        if (cls) interceptSrc(cls.prototype);
    }

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

    const interceptStyleText = (text: string) => {
        return text.replace(/url\(['"]?(.*?)['"]?\)/g, (match, url) => {
            const normalizedUrl = resolveVirtualPath(url, baseUrl);
            if (assetsMap[normalizedUrl]) {
                return `url('${assetsMap[normalizedUrl]}')`;
            }
            return match;
        });
    };

    // Hook FontFace API for fonts loaded dynamically
    if (typeof (window as any).FontFace !== 'undefined') {
        const OriginalFontFace = (window as any).FontFace;
        (window as any).FontFace = function(family: string, source: string | ArrayBuffer, descriptors?: any) {
            if (typeof source === 'string') {
                source = interceptStyleText(source);
            }
            return new OriginalFontFace(family, source, descriptors);
        };
        (window as any).FontFace.prototype = OriginalFontFace.prototype;
    }

    // Intercept CSS in style elements at the prototype level
    if (typeof Node !== 'undefined') {
        const textContentDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
        if (textContentDesc && textContentDesc.set) {
            Object.defineProperty(Node.prototype, 'textContent', {
                set: function(val: string) {
                    if (this.nodeName === 'STYLE' && typeof val === 'string') {
                        val = interceptStyleText(val);
                    }
                    textContentDesc.set!.call(this, val);
                },
                get: function() {
                    return textContentDesc.get!.call(this);
                }
            });
        }

        const originalAppendChild = Node.prototype.appendChild;
        Node.prototype.appendChild = function<T extends Node>(child: T): T {
            if (this.nodeName === 'STYLE' && child.nodeType === 3 && child.nodeValue) {
                child.nodeValue = interceptStyleText(child.nodeValue);
            } else if (child.nodeName === 'STYLE' && child.textContent) {
                child.textContent = interceptStyleText(child.textContent);
            }
            return originalAppendChild.call(this, child);
        };

        const originalInsertBefore = Node.prototype.insertBefore;
        Node.prototype.insertBefore = function<T extends Node>(node: T, child: Node | null): T {
            if (this.nodeName === 'STYLE' && node.nodeType === 3 && node.nodeValue) {
                node.nodeValue = interceptStyleText(node.nodeValue);
            } else if (node.nodeName === 'STYLE' && node.textContent) {
                node.textContent = interceptStyleText(node.textContent);
            }
            return originalInsertBefore.call(this, node, child);
        };
    }

    if (typeof Element !== 'undefined') {
        const innerHTMLDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        if (innerHTMLDesc && innerHTMLDesc.set) {
            Object.defineProperty(Element.prototype, 'innerHTML', {
                set: function(val: string) {
                    if (this.nodeName === 'STYLE' && typeof val === 'string') {
                        val = interceptStyleText(val);
                    }
                    innerHTMLDesc.set!.call(this, val);
                },
                get: function() {
                    return innerHTMLDesc.get!.call(this);
                }
            });
        }
    }
}