export interface AdNetworkAdapter {
    readonly id: string;
    readonly name: string;
    injectHead?(): string;
    injectBody?(): string;
    wrapCTA(storeUrl?: string): string;
}