
# Project Cleanup Skill

This skill helps remove legacy and unused files from the project to improve maintainability and performance.

## Usage

Use this skill when you need to clean up the project structure after a major refactoring or migration.

## Steps

1.  **Backup**: Ensure all local changes are committed or stashed before proceeding.
2.  **Verify Build**: Run `npm run build` to ensure the project is currently stable.
3.  **Delete Legacy Files**:
    Remove the following files which have been deprecated and replaced by newer implementations:
    - `src/lib/services/data-source.ts` (Legacy data abstraction)
    - `src/lib/services/order-service.ts` (Unused)
    - `src/lib/services/event-service.ts` (Unused)
    - `src/lib/mock-data.ts` (Large unused mock data)

4.  **Delete Temporary Scripts**:
    Remove scripts used for data migration or inspection that are no longer needed:
    - `scripts/import_excel_stock.js`
    - `scripts/import_images_from_network.js`
    - `scripts/import_products_csv.js`
    - `scripts/import_stock_excel.js`
    - `scripts/generate_mock_data.js`
    - `scripts/parse_product_names.js`
    - `scripts/inspect_excel.js`
    - `scripts/inspect_inventory_excel.js`
    - `scripts/migrate-to-supabase.js`
    - `scripts/verify_schema.js`
    - `scripts/sync_product_codes.js`
    - `scripts/sync_product_types.js`

5.  **Verify**: Run `npm run build` again to ensure no regressions were introduced.

## Example Command

```bash
# Delete legacy service files
rm src/lib/services/data-source.ts src/lib/services/order-service.ts src/lib/services/event-service.ts src/lib/mock-data.ts

# Delete scripts
rm scripts/*.js
```
