import { AppDataSource } from '../config/data-source';
import logger from '../config/logger';

/**
 * Replaces the legacy full unique index on `invoice_number` with a partial unique index
 * so soft-deleted invoices do not block reusing the same number.
 */
export async function ensureKoalInvoiceNumberIndex(): Promise<void> {
    await AppDataSource.manager.query(`
        DROP INDEX IF EXISTS "IDX_44ff5961fc1aa84f6c75e28905";
        DROP INDEX IF EXISTS "UQ_koal_invoices_invoice_number_active";
        CREATE UNIQUE INDEX "UQ_koal_invoices_invoice_number_active"
            ON "koal_invoices" ("invoice_number")
            WHERE "is_deleted" = false;
    `);
    logger.info('Ensured partial unique index on koal_invoices.invoice_number (active rows only)');
}
