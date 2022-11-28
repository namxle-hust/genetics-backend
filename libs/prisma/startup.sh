#!/bin/sh
prisma migrate deploy
prisma db push
prisma studio