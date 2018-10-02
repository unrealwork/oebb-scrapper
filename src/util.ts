import * as args from "args";
import {existsSync, writeFileSync} from "fs";
import {dirname} from "path";
import {mkdir} from "shelljs";
import {createLogger, format, transports} from "winston";
import {IAtsdClientConfig} from "./atsdClient";
import {ITrainInfo} from "./oebbClient";

export function formatDate(date: Date): string {
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

export function flushTrainInfo(data: any, id: string, date: Date): void {
    try {
        const filePath =
            `data/${formatDate(date)}/${data.name}/${id}/train-info-${date.getHours()}-${date.getMinutes()}`;
        const dirPath = dirname(filePath);
        logger.debug(dirPath);
        if (!existsSync(dirPath)) {
            mkdir("-p", dirPath);
        }
        writeFileSync(filePath, JSON.stringify(data, undefined, 2));
        // logger.debug(`JSON file for train "${data.name}" with id ${id} was successfully flushed.`);
    } catch (e) {
        logger.error(`Failed to flush JSON file train "${data.name}" with id ${id}. Reason: ${prettyPrint(e)}`);
    }

}

export function prettyPrint(json: any): string {
    return JSON.stringify(json, undefined, 2);
}

const myFormat = format.printf((info) => {
    return `${info.timestamp} [${info.level}]: ${info.message}`;
});

const loggerFormat = format.combine(myFormat, format.label(), format.timestamp(), format.colorize());

export const logger = createLogger({
    format: loggerFormat,
    level: "info",
    transports: [
        new transports.File({filename: "error.log", level: "error"}),
        new transports.File({filename: "combined.log"}),
    ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
    logger.add(new transports.Console({
        format: loggerFormat,
        level: "debug",
    }));
}

export interface IAppConfig {
    atsd: IAtsdClientConfig;
    isCollectHistory: boolean;
    entity: string,
    cron: string;
}

export function toBatch(t: ITrainInfo, date: Date, entity: string): string[] {
    const result: string[] = [];
    if (t.locations) {
        for (const loc of t.locations) {
            const utcdate = utcDate(date);
            if (loc.depTime && typeof loc.depTimeProgMinutes === "number") {
                result.push(`series e:${entity} m:departure_offset_minutes=${loc.depTimeProgMinutes} ` +
                    `t:number="${t.number}" ` +
                    `t:id="${t.id}" x:departure_offset_minutes="${loc.name}" d:${utcdate}T${loc.depTime}:00+02:00`);
            }
            if (loc.arrTime && typeof loc.arrTimeProgMinutes === "number") {
                result.push(`series e:${entity} m:arrival_offset_minutes=${loc.arrTimeProgMinutes}` +
                    ` t:number="${t.number}" ` +
                    `t:id="${t.id}" x:arrival_offset_minutes="${loc.name}" d:${utcdate}T${loc.arrTime}:00+02:00`);
            }

        }
    }
    return result;
}

export function utcDate(date: Date): string {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    function leadingZero(dayToFormat: number) {
        return dayToFormat < 10 ? "0" + dayToFormat : dayToFormat;
    }

    return `${year}-${leadingZero(month)}-${leadingZero(day)}`;
}

export function getAppConfig(): IAppConfig {
    args.option("port", "The port of ATSD instance", 443)
        .option("host", "The hostname of ATSD instance", "localhost")
        .option("username", "The username to access ATSD instance API", "username")
        .option("password", "The password to access ATSD instance API", "password")
        .option("entity", "The Atsd entity which is stored data", "oebb")
        .option("history", "Collect history of scraped json files", false);

    const flags = args.parse(process.argv);

    return {
        atsd: {
            credentials: {
                password: flags.password,
                username: flags.username,
            },
            port: flags.port,
            scheme: "https",
            server: flags.host,
        },
        cron: process.env.SCRAPE_CRON ? process.env.SCRAPE_CRON : "*/15 * * * *",
        entity: flags.entity,
        isCollectHistory: flags.history,
    };
}
