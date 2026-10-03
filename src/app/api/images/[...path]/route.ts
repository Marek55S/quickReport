import { readImage } from "@/lib/storage";

// Streams private report photos from Cloud Storage, so the bucket never has to be public.
export async function GET(_req: Request, ctx: RouteContext<"/api/images/[...path]">) {
  const { path } = await ctx.params;
  const objectPath = path.join("/");
  if (!/^(reports|seed)\/[\w./-]+$/.test(objectPath) || objectPath.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { contents, contentType } = await readImage(objectPath);
    return new Response(new Uint8Array(contents), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
