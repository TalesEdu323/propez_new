import { useState } from 'react';
import { Users } from 'lucide-react';

export function FounderPhoto() {
  const [imageError, setImageError] = useState(false);
  if (imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-100">
        <Users className="w-16 h-16 text-zinc-400" />
      </div>
    );
  }
  return (
    <img
      src="/founder.png"
      alt="Eduardo Gomes - Fundador e CTO do Propez, produto Taggo"
      className="w-full h-full object-cover"
      onError={() => setImageError(true)}
    />
  );
}
