#!/bin/sh

yarn install

prisma migrate deploy
prisma db push
prisma studio