import type { BlogContentBlock } from './blockTypes';

export function BlogPostContent({ blocks }: { blocks: BlogContentBlock[] }) {
  if (!blocks?.length) {
    return <p className="text-zinc-500">Conteúdo em breve.</p>;
  }

  return (
    <div className="prose prose-zinc max-w-none space-y-8">
      {blocks.map((block, i) => {
        if (block.type === 'text') {
          return (
            <div
              key={i}
              className="text-zinc-700 leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_p]:mb-4"
              dangerouslySetInnerHTML={{ __html: block.data.html || '' }}
            />
          );
        }
        const ratio = block.data.image_ratio || '50-50';
        const imgFlex = ratio.startsWith('7') ? 'lg:w-[58%]' : ratio.startsWith('6') ? 'lg:w-[52%]' : 'lg:w-1/2';
        const textFlex = 'lg:flex-1';
        const imgFirst = block.data.image_position !== 'right';
        const imgEl = block.data.image_url ? (
          <img src={block.data.image_url} alt="" className="rounded-2xl w-full object-cover" />
        ) : null;
        const textEl = (
          <div
            className="text-zinc-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: block.data.text || '' }}
          />
        );
        return (
          <div key={i} className={`flex flex-col gap-6 ${imgFirst ? '' : 'lg:flex-row-reverse'} lg:flex-row lg:items-start`}>
            {imgEl && <div className={imgFlex}>{imgEl}</div>}
            <div className={textFlex}>{textEl}</div>
          </div>
        );
      })}
    </div>
  );
}
