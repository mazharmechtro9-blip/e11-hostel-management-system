import { RouteView } from "@/components/route-view";
export default async function Page({
  params,
}: {
  params: Promise<{ route?: string[] }>;
}) {
  const { route = [] } = await params;
  return <RouteView route={route} />;
}
