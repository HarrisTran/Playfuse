export function resolveVirtualPath(url: string, baseUrl?: string): string {

    let normalizedURI = url.split('?')[0] ?? url;
    let uri = normalizedURI.split('#')[0];

    if (uri?.startsWith('http://') || uri?.startsWith('https://')){
        if(baseUrl) {
            uri = uri?.replace(baseUrl, '');
        } 
    }
    if (uri?.startsWith('./')) {
        uri = uri.replace(/^\.\//, '');
    }

    return uri as string;
}