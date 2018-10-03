import axios from "axios";
import {AtsdClient, IAtsdClientConfig} from "./atsdClient";
import {ITrain, OebbClient} from "./oebbClient";
import {IAppConfig, logger, prettyPrint, toBatch} from "./util";

export class TrainScrapeTask {
    private readonly client: OebbClient;
    private readonly atsdClient: AtsdClient;
    private readonly entity: string;

    constructor(config: IAppConfig) {
        this.client = new OebbClient(config.isCollectHistory);
        this.atsdClient = new AtsdClient(config.atsd);
        this.entity = config.entity;
    }

    public scrape() {
        this.client.trainsList({
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
            axios.all(trains.map((t: ITrain) => this.client.getInfo(t, date).catch((err) => {
                logger.error(`Failed to get info for train: ${prettyPrint(t)}. Reason: ${err.toString()}`);
                return null;
            })))
                .then((values) => {
                    logger.info(`Scraping time: ${new Date().getTime() - date.getTime()} ms.`);
                    const commands = values
                        .map((t) => toBatch(t, date, this.entity))
                        .reduce((result, batch) => [...result, ...batch], []);
                    this.atsdClient.sendCommands(commands)
                        .then((result) =>
                            logger.info(`Batch of commands is sent. Result: ${prettyPrint(result)}`))
                        .catch((err) =>
                            logger.error(`Failed to send batch of commands! ${err.toString()}`));
                });
        }).catch((err) => logger.error(`Failed to get train list ${err.toString()}`));
    }
}
