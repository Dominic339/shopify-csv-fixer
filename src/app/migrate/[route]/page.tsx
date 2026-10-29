// /migrate/<route>: one store-migration page per source → target pair (English only).
import { notFound } from "next/navigation";
import { CONVERT_ROUTES, getConvertRoute } from "@/lib/convertRoutes";
import { MigrateView, migrateMetadata } from "@/views/migratePages";

export const dynamicParams = false;

export function generateStaticParams() {
  return CONVERT_ROUTES.map((r) => ({ route: r.slug }));
}

type Props = { params: Promise<{ route: string }> };

export async function generateMetadata({ params }: Props) {
  const route = getConvertRoute((await params).route);
  return route ? migrateMetadata(route) : {};
}

export default async function MigratePage({ params }: Props) {
  const route = getConvertRoute((await params).route);
  if (!route) notFound();
  return <MigrateView route={route} />;
}
