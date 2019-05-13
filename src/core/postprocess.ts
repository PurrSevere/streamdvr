"use strict";

import * as fs from "fs";
import * as mv from "mv";
import * as path from "path";
import {spawn} from "child_process";
import {Dvr, Config, MSG} from "../core/dvr.js";
import {Site, Streamer, CapInfo} from "../core/site.js";

const colors = require("colors");

export class PostProcess {

    protected dvr: Dvr;
    protected config: Config;
    protected postProcessQ: Array<CapInfo>;

    constructor(dvr: Dvr) {
        this.dvr = dvr;
        this.config = dvr.config;
        this.postProcessQ = [];
    }

    public add(capInfo: CapInfo) {
        this.postProcessQ.push(capInfo);
        if (this.postProcessQ.length === 1) {
            this.convert();
        }
    }

    protected convert() {

        const capInfo: CapInfo          = this.postProcessQ[0];
        const site: Site | null         = capInfo.site;
        const streamer: Streamer | null = capInfo.streamer;
        const namePrint: string         = streamer ? `${colors.name(streamer.nm)} ` : "";
        const fileType: string          = this.config.recording.autoConvertType;
        const completeDir: string       = this.getCompleteDir(site, streamer);
        const uniqueName: string        = this.uniqueFileName(completeDir, capInfo.filename, fileType);
        const completeFile: string      = uniqueName + "." + fileType;
        const capPath: string           = path.join(this.config.recording.captureDirectory, capInfo.filename + ".ts");
        const cmpPath: string           = path.join(completeDir, completeFile);

        if (fileType === "ts") {
            this.dvr.print(MSG.DEBUG, `${namePrint} recording moved ${capPath} to ${cmpPath}`);
            mv(capPath, cmpPath, (err: Error) => {
                if (err) {
                    this.dvr.print(MSG.ERROR, `${colors.site(capInfo.filename)}: ${err.toString()}`);
                }
            });

            this.postScript(site, streamer, completeDir, completeFile);
            return;
        }

        const script = this.dvr.calcPath(this.config.recording.postprocess);
        const args = [ capPath, cmpPath, fileType ];
        const myCompleteProcess = spawn(script, args);

        this.dvr.print(MSG.INFO, `${namePrint} converting to ${fileType}: ` +
            `${colors.cmd(script)} ${colors.cmd(args.join(" "))}`, site);
        if (site && streamer) {
            site.storeCapInfo(streamer, completeFile, myCompleteProcess, true);
        }

        myCompleteProcess.on("close", () => {
            if (!this.config.recording.keepTsFile) {
                if (fs.existsSync(args[0])) {
                    fs.unlinkSync(args[0]);
                } else {
                    this.dvr.print(MSG.ERROR, `${args[0]} does not exist, cannot remove`);
                }
            }

            this.dvr.print(MSG.INFO, `${namePrint} done converting ${completeFile}`, site);
            this.postScript(site, streamer, completeDir, completeFile);
        });

        myCompleteProcess.on("error", (err: Error) => {
            this.dvr.print(MSG.ERROR, err.toString());
        });
    }

    protected postScript(site: Site | null, streamer: Streamer | null, completeDir: string, completeFile: string) {
        if (!this.config.postprocess) {
            this.nextConvert(site, streamer);
            return;
        }

        const script: string      = this.dvr.calcPath(this.config.postprocess);
        const args: Array<string> = [completeDir, completeFile];
        const namePrint: string   = streamer === null ? "" : `${colors.name(streamer.nm)} `;

        this.dvr.print(MSG.INFO, `${namePrint} running global postprocess script: ` +
            `${colors.cmd(script)} ${colors.cmd(args.join(" "))}`, site);
        const userPostProcess = spawn(script, args);

        if (site && streamer) {
            site.storeCapInfo(streamer, completeFile, userPostProcess, true);
        }

        userPostProcess.on("close", () => {
            this.dvr.print(MSG.INFO, `${namePrint} done post-processing ${colors.file(completeFile)}`, site);
            this.nextConvert(site, streamer);
        });
    }

    protected nextConvert(site: Site | null, streamer: Streamer | null) {

        if (site && streamer) {
            site.clearProcessing(streamer);
        }

        // Pop current job, and start next conversion job (if any)
        this.postProcessQ.shift();
        if (this.postProcessQ.length > 0) {
            this.convert();
        }
    }

    protected getCompleteDir(site: Site | null, streamer: Streamer | null) {
        if (site && streamer) {
            return site.getCompleteDir(streamer);
        }

        return this.dvr.mkdir(this.config.recording.completeDirectory + "/UNKNOWN");
    }

    protected uniqueFileName(completeDir: string, filename: string, fileType: string) {
        // If the output file already exists, make filename unique
        let count = 1;
        let fileinc = filename;
        let name = path.join(completeDir,  fileinc + "." + fileType);
        while (fs.existsSync(name)) {
            this.dvr.print(MSG.ERROR, name + " already exists");
            fileinc = filename + " (" + count.toString() + ")";
            name = path.join(completeDir, fileinc + "." + fileType);
            count++;
        }
        return fileinc;
    }

}
