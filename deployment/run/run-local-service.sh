#!/bin/bash

yarn build:fastq
yarn build:information

pm2 start /home/user/genetics/genetics-backend/deployment/run/ecosystem.config.js
