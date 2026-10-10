export function resolveVirtualPath(url: string, baseUrl?: string): string {
    let normalizedURI = url.split('?')[0] ?? url;
    let uri = normalizedURI.split('#')[0] as string;

    if (baseUrl) {
        let basePath = baseUrl;
        const lastSlash = baseUrl.lastIndexOf('/');
        if (lastSlash !== -1) {
            basePath = baseUrl.substring(0, lastSlash + 1);
        }
        
        if (uri.startsWith(basePath)) {
            uri = uri.substring(basePath.length);
        } else if (uri.startsWith(baseUrl)) {
            uri = uri.substring(baseUrl.length);
        }
    }

    if (uri.startsWith('./')) {
        uri = uri.substring(2);
    }
    if (uri.startsWith('/')) {
        uri = uri.substring(1);
    }

    return uri;
}