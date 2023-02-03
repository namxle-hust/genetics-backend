#!/bin/bash

docker compose -f docker-compose.prod.yml up -d --build -V \
sample-import \
samples-handler \
sample-status-processor \
vcf-analyzer-service \
information-service