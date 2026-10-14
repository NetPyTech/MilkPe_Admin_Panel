import { useEffect, useRef, useState } from 'react';

/** A search box that mirrors one value of the address. What the person types is sent after a short pause; when the address changes by itself (a
 * link, "Clear filters", the back button) the box follows it and nothing is sent, so the old text is never written back over the new address. */
export function useSearchBox(urlValue: string | undefined, send: (value: string | undefined) => void, delayMs = 300) {
  const [text, setText] = useState(urlValue ?? '');
  const typed = useRef(false);
  const latest = useRef({ send, text });
  useEffect(() => { latest.current = { send, text }; });   // after every render, and before the effects below read it

  useEffect(() => {
    if ((urlValue ?? '') !== latest.current.text.trim()) {
      typed.current = false;
      setText(urlValue ?? '');
    }
  }, [urlValue]);

  useEffect(() => {
    if (!typed.current) return;
    const timer = setTimeout(() => {
      typed.current = false;
      latest.current.send(text.trim() || undefined);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [text, delayMs]);

  return {
    text,
    onType: (value: string) => { typed.current = true; setText(value); },
    clear: () => { typed.current = false; setText(''); },
  };
}
