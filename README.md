# ÖBB Scraper

Scraping info about trains from oebb.at site.

## Run as Docker image

```bash
docker build -t oebb-scraper . && docker run -d \
    --env SCRAPE_CRON='*/1 * * * *' \
    --volume $(pwd)/data:/oebb-scrapper/data \
    --name oscraper oebb-scraper \
    --port 443 \
    --username username \
    --password password \
    --host atsd_host \
    --entity oebb.at \
    --history   
```
