import { redirect } from "next/navigation";

type GenerateFilesRedirectProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default function GenerateFilesRedirect({ searchParams }: GenerateFilesRedirectProps) {
  const params = new URLSearchParams();

  const brandId = searchParams.brandId;
  if (typeof brandId === "string" && brandId.trim()) {
    params.set("brandId", brandId.trim());
  }

  const query = params.toString();
  redirect(`/brand-monitor${query ? `?${query}` : ""}#files`);
}
