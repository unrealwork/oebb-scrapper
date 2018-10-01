# ÖBB Scrapper

Scraping info about trains from oebb.at site.

## Run as Docker image

```bash
docker build -t <image_tag> . && docker run \
    --env SCRAPE_CRON=*/1 * * * * \
    --name oebb-scrapper <image_tag> \
    --port 443 \
    --username username \
    --password password \
    --host atsd_host
```
