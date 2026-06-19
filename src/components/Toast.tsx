// Mini-notification éphémère (2 s) en bas d'écran.

import { useState, useRef } from 'react';

export function useToast() {
  const [msg, setMsg] = useState('');
  const timer = useRef<number | null>(null);
  const push = (m: string, ms = 2200) => {
    setMsg(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(''), ms);
  };
  return { msg, push };
}

export function Toast({ msg }: { msg: string }) {
  return <div className={`toast ${msg ? 'show' : ''}`}>{msg}</div>;
}
