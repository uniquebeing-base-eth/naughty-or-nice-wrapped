import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { Button } from '@/components/ui/button';
import { ExternalLink, Pickaxe, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const BLOOM_MINING_URL = 'https://farcaster.xyz/miniapps/egWGFSrJ0s-H/bloom-protocol';
const INVITE_CODE = 'BLOOM2025';
const STORAGE_KEY = 'bloom-mining-promo-seen-v1';

export const BloomMiningPromo = () => {
  const [open, setOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
      setTimeout(() => setAnimate(true), 50);
    }
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setAnimate(false);
    setTimeout(() => setOpen(false), 250);
  };

  const openExternally = async () => {
    try {
      await sdk.actions.openUrl(BLOOM_MINING_URL);
    } catch {
      window.open(BLOOM_MINING_URL, '_blank', 'noopener,noreferrer');
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(INVITE_CODE);
      setCopied(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy code');
    }
  };

  const handleMine = async () => {
    await copyCode();
    await openExternally();
    close();
  };

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center px-5 transition-opacity duration-300 ${animate ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={close} />

      <div
        className={`relative z-10 w-full max-w-md rounded-3xl p-7 text-center bg-gradient-to-b from-[#1f0a2a] via-[#15081e] to-[#0a0510] border border-amber-400/30 shadow-2xl shadow-amber-500/20 transition-all duration-300 ${animate ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
      >
        <button
          onClick={close}
          className="absolute top-3 right-3 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/40 mb-5">
          ⛏️
        </div>

        <div className="inline-block px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wide mb-3">
          ✨ EXCLUSIVE FOR YOU
        </div>

        <h2 className="font-display text-3xl font-bold text-white mb-2">
          Mine <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-pink-400 bg-clip-text text-transparent">$BLOOM</span>
        </h2>
        <p className="text-white/70 text-sm leading-relaxed mb-5">
          Our new mini app <span className="text-white font-semibold">Bloom Mining</span> just dropped 🌸
          Start mining and earn <span className="text-amber-300 font-semibold">$BLOOM</span> tokens daily!
        </p>

        <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-pink-500/10 border border-amber-400/30 p-4 mb-5">
          <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Your Special Invite Code</p>
          <button
            onClick={copyCode}
            className="w-full flex items-center justify-center gap-2 text-2xl font-mono font-bold text-amber-300 hover:text-amber-200 transition"
          >
            {INVITE_CODE}
            {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 opacity-60" />}
          </button>
        </div>

        <Button
          onClick={handleMine}
          className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:from-amber-400 hover:to-pink-400 text-white font-bold py-6 rounded-full text-base gap-2 shadow-lg shadow-orange-500/40 border border-amber-300/40"
        >
          <Pickaxe className="w-5 h-5" />
          Start Mining Now
          <ExternalLink className="w-4 h-4" />
        </Button>

        <button
          onClick={close}
          className="mt-3 text-white/40 hover:text-white/70 text-xs transition"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};

export default BloomMiningPromo;
