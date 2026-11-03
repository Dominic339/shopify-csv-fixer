// /migrate: index of store-migration pages (English only).
import { MigrateIndexView, migrateIndexMetadata } from "@/views/migratePages";

export const metadata = migrateIndexMetadata;

export default function MigrateIndexPage() {
  return <MigrateIndexView />;
}
