FROM node:10.11.0

RUN apt-get update && apt-get install locales

RUN locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8


ADD  ./   /oebb-scrapper

RUN yarn global add typescript \
    && cd /oebb-scrapper \
    && yarn install \
    && tsc;

ENTRYPOINT ["/bin/sh", "/oebb-scrapper/entrypoint.sh"]
