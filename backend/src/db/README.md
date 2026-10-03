Prisma DB client

Usage:

1. Set `DATABASE_URL` env var
2. Run `npm run prisma:generate` and `npm run prisma:migrate:dev`
3. Use `require('../db/prismaClient').getPrisma()` to access the client

Note: This directory contains only a small wrapper to keep a singleton PrismaClient instance.
