#!/bin/bash

echo $S3_ACCESS_KEY:$S3_SECRET_KEY > /home/ubuntu/.passwd-s3fs && \
chmod 600 /home/ubuntu/.passwd-s3fs

s3fs varigenes-storage /home/s3  -o passwd_file=${HOME}/.passwd-s3fs -o allow_other

/bin/bash