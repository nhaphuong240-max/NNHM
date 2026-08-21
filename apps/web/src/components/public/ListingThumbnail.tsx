import { brand } from '../../theme/tokens';

type Props = {
  url: string | null | undefined;
  alt: string;
  className?: string;
};

export function ListingThumbnail({ url, alt, className = 'aspect-video rounded-lg' }: Props) {
  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        className={`${className} object-cover w-full h-full bg-neutral-100`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${className} flex items-center justify-center text-3xl`}
      style={{ background: brand.hover }}
      aria-hidden
    >
      🏠
    </div>
  );
}
