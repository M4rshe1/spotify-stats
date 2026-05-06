import { db } from "@/server/db";

async function truncateTables() {
    const excludedTables = ["_prisma_migrations", "user", "session", "account"];

    try {
        const tablenames = await db.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

        const tablesToTruncate = tablenames
            .map((t) => t.tablename)
            .filter((name) => !excludedTables.includes(name));

        if (tablesToTruncate.length === 0) {
            console.log("No tables found to truncate.");
            return;
        }

        console.log(`Truncating: ${tablesToTruncate.join(", ")}`);

        for (const table of tablesToTruncate) {
            await db.$executeRawUnsafe(
                `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`,
            );
        }

        console.log("Database cleanup successful.");
    } catch (error) {
        console.error("Error truncating tables:", error);
    } finally {
        await db.$disconnect();
    }
}

truncateTables();