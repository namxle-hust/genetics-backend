#!/bin/bash

HOME=/usr/src/app

echo $S3_ACCESS_KEY:$S3_SECRET_KEY > $HOME/.passwd-s3fs && \

chmod 600 $HOME/.passwd-s3fs

s3fs varigenes-storage /home/s3  -o passwd_file=${HOME}/.passwd-s3fs -o allow_other -o umask=000

node /home/ubuntu/genetics/dist/apps/sample-import/main.js 