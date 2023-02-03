#!/bin/bash

docker compose -f docker-compose.prod.yml up -d --build -V \
sample-import \
vcf-analyzer-service \
information-service