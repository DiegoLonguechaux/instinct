'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useState } from 'react';

export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return <div className="aspect-4/5 w-full bg-instinct-foreground/10" aria-hidden="true" />;
  }

  return (
    <div>
      <div className="relative aspect-4/5 w-full overflow-hidden bg-instinct-foreground/10">
        <Image
          src={images[index]}
          alt={title}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-3">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Voir la photo ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                'relative size-20 overflow-hidden border-2 bg-instinct-foreground/10',
                i === index ? 'border-instinct-purple' : 'border-transparent opacity-70 hover:opacity-100'
              )}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
