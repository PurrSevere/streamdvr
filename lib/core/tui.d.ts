import { Dvr, Config } from "./dvr";
import { Site } from "./site";
export declare class Tui {
    protected dvr: Dvr;
    protected config: Config;
    protected SITES: Array<Site>;
    protected hideOffline: boolean;
    protected listSelect: any;
    protected sitelistSelect: any;
    protected screen: any;
    protected list: any;
    protected sitelist: any;
    protected prompt: any;
    protected inputBar: any;
    protected listmenu: any;
    protected sitemenu: any;
    protected logbody: any;
    constructor(dvr: Dvr);
    protected createTui(): void;
    protected parseCli(tokens: any): void;
    addSite(site: Site): void;
    log(text: string): void;
    protected buildListEntry(site: Site, streamer: any): string[];
    protected populateTable(site: Site, table: any): void;
    protected rebuildList(): void;
    render(redrawList: boolean, site?: Site): void;
    protected updateList(siteName: string, nm: string, options: any): Promise<void>;
}
