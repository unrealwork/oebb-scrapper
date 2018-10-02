import {CronJob} from "cron";
import {TrainScrapeTask} from "./jobs";
import {getAppConfig, IAppConfig, logger, prettyPrint} from "./util";

const appConfig: IAppConfig = getAppConfig();

const task: TrainScrapeTask = new TrainScrapeTask(appConfig);

const job = new CronJob(appConfig.cron, () => {
    task.scrape();
});

logger.info(`Starting oebb-scrapper with configuration ${prettyPrint(appConfig)}`);
try {
    job.start();
} catch (e) {
    logger.error(`Unexpected error during scraping procedure ${prettyPrint(e)}`);
}
