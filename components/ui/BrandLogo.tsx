import { BASE_PATH } from "@/lib/basePath";

/**
 * The MonkeGram "MG" mark. A plain <img> (the static export disables the Next
 * image optimizer) with the basePath prefix that raw asset paths need.
 */
export function BrandLogo({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE_PATH}/mglogo.png`}
      alt="MonkeGram"
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: "auto" }}
    />
  );
}
