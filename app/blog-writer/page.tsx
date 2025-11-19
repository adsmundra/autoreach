import { redirect } from "next/navigation";

type BlogWriterRedirectProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default function BlogWriterRedirect({ searchParams }: BlogWriterRedirectProps) {
  const params = new URLSearchParams();

  const brandId = searchParams.brandId;
  if (typeof brandId === "string" && brandId.trim()) {
    params.set("brandId", brandId.trim());
  }

  const blogId = searchParams.blogId;
  if (typeof blogId === "string" && blogId.trim()) {
    params.set("blogId", blogId.trim());
  }

  const query = params.toString();
  redirect(`/brand-monitor${query ? `?${query}` : ""}#ugc`);
}
