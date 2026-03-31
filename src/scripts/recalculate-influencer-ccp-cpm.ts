/**
 * Backfill `ccp` and `cpm` on all influencers using the same formulas as the app:
 * - CCP: (buyPrice / avgViews) * 1000
 * - CPM: (sellPrice / avgViews) * 1000
 *
 * There is no `cpa` column; sell-side cost per thousand is stored as `cpm`.
 *
 * Usage: npx ts-node src/scripts/recalculate-influencer-ccp-cpm.ts
 * Or:    npm run db:recalc-influencer-scores
 */
import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { Influencer } from '../entity/influencer.entity';
import { calculatePricePerThousand } from '../services/v1/admin/influencer.service';

async function main() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Influencer);
    const influencers = await repo.find();

    let updated = 0;
    for (const inf of influencers) {
        const nextCcp = calculatePricePerThousand(inf.buyPrice, inf.avgViews) ?? null;
        const nextCpm = calculatePricePerThousand(inf.sellPrice, inf.avgViews);

        const ccpChanged = inf.ccp !== nextCcp;
        const cpmChanged = nextCpm != null && inf.cpm !== nextCpm;

        inf.ccp = nextCcp;
        if (nextCpm != null) {
            inf.cpm = nextCpm;
        }

        if (ccpChanged || cpmChanged) {
            await repo.save(inf);
            updated += 1;
        }
    }

    await AppDataSource.destroy();
    console.log(`Processed ${influencers.length} influencers; updated ${updated} rows.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
