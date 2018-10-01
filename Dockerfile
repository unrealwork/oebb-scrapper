FROM node:10.11.0-alpine

ADD  ./   /oebb-scrapper

RUN yarn global add typescript \
    && cd /oebb-scrapper \
    && yarn install \
    && tsc;

ENTRYPOINT ["/bin/sh", "/oebb-scrapper/entrypoint.sh"]
