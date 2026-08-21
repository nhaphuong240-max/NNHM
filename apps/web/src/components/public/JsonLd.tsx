import { useEffect } from 'react';

const SCRIPT_ID = 'nnhn-json-ld';

type Props = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: Props) {
  const payload = JSON.stringify(data);

  useEffect(() => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = payload;
    return () => {
      script?.remove();
    };
  }, [payload]);

  return null;
}
