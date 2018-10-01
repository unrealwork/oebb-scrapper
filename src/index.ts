import * as args from "args";
import axios from "axios";
import {CronJob} from "cron";
import {AtsdClient} from "./atsdClient";
import {ITrain, OebbClient} from "./oebbClient";
import {IAppConfig, logger, prettyPrint, toBatch} from "./util";

// trainScrapeJob();
args.option("port", "The port of ATSD instance", 443)
    .option("host", "The hostname of ATSD instance", "localhost")
    .option("username", "The username to access ATSD instance API", "username")
    .option("password", "The password to access ATSD instance API", "password");

const flags = args.parse(process.argv);

const appConfig: IAppConfig = {
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
};

const client = new OebbClient();
const atsdClient = new AtsdClient(appConfig.atsd);

function trainScrapeJob() {
    client.trainsList({
        look_maxx: 39760338,
        look_maxy: 59029900,
        look_minx: -1943763,
        look_miny: 39961250,
        look_nv: "get_zntrainname|no|attr|81|get_rtonly|no|zugposmode|" +
            "2|interval|30000|intervalstep|5000|maxnumberoftrains|500|",
        look_productclass: 15,
    }).then((trains: ITrain[]) => {
        const date: Date = new Date();
        logger.info(`Scrapping start time: ${date.toISOString()}`);
        logger.debug(`Active trains: ${prettyPrint(trains)}`);
        axios.all(trains.map((t: ITrain) => client.getInfo(t, date).catch((err) => {
            logger.error(`Failed to get info for train: ${prettyPrint(t)}. Reason: ${prettyPrint(err)}`);
            return null;
        })))
            .then((values) => {
                logger.info(`Scraping time: ${new Date().getTime() - date.getTime()} ms.`);
                const commands = values
                    .map((t) => toBatch(t, date))
                    .reduce((result, batch) => [...result, ...batch], []);
                atsdClient.sendCommands(commands)
                    .then((result) =>
                        logger.info(`Batch of commands is sent. Result: ${prettyPrint(result)}`))
                    .catch((err) =>
                        logger.error(`Failed to send batch of commands! ${err.toString()}`));
            });
    }).catch((err) => logger.error(`Failed to get train list ${prettyPrint(err)}`));
}

const job = new CronJob(appConfig.cron, trainScrapeJob);
logger.info(`Starting oebb-scrapper with configuration ${prettyPrint(appConfig)}`);
try {
    job.start();
} catch (e) {
    logger.error(`Unexpected error during scraping procedure ${prettyPrint(e)}`);
}