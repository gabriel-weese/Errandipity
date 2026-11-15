import { useEffect, useState } from 'react';

/**
 * Phone width: below Tailwind's `md` breakpoint. Layout differences are written with
 * `md:` and `max-md:` classes; this hook is for the cases that render something else
 * altogether (a bottom sheet in place of a dropdown).
 */
const NARROW_QUERY = '(max-width: 767px)';

export function useIsNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(NARROW_QUERY);
    const onChange = () => setNarrow(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return narrow;
}
