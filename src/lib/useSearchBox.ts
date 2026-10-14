import { useEffect, useRef, useState } from 'react';

/** A search box that mirrors one value of the address. What the person types is sent after a short pause; when the address changes by itself (a
 * link, "Clear filters", the back button) the box follows it and nothing is sent, so the old text is never written back over the new address.
 * The address catches up with a send a little later (and may do so while the person keeps typing), so the values sent are remembered: one of
 * those arriving is not a change from outside and must not replace newer typing. */
export function useSearchBox(urlValue: string | undefined, send: (value: string | undefined) => void, delayMs = 300) {
  const [text, setText] = useState(urlValue ?? '');
  const typed = useRef(false);
  const sent = useRef<string[]>([]);   // sent, and not yet seen in the address; oldest first
  const latest = useRef({ send, text, urlValue: urlValue ?? '' });
  useEffect(() => { latest.current = { send, text, urlValue: urlValue ?? '' }; });   // after every render, and before the effects below read it

  useEffect(() => {
    const url = urlValue ?? '';
    const own = sent.current.indexOf(url);
    if (own >= 0) {
      sent.current.splice(0, own + 1);   // this send (and any older one the address skipped over) has arrived
      return;
    }
    sent.current = [];
    if (url !== latest.current.text.trim()) {
      typed.current = false;
      setText(url);
    }
  }, [urlValue]);

  useEffect(() => {
    if (!typed.current) return;
    const timer = setTimeout(() => {
      typed.current = false;
      const value = text.trim();
      if (value !== latest.current.urlValue) sent.current.push(value);   // an unchanged address will not announce it
      latest.current.send(value || undefined);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [text, delayMs]);

  return {
    text,
    onType: (value: string) => { typed.current = true; setText(value); },
    clear: () => { typed.current = false; setText(''); },
  };
}
