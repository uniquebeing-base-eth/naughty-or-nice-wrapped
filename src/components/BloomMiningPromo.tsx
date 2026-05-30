import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const BLOOM_MINING_URL = 'https://farcaster.xyz/miniapps/UnTd2dXmN_HG/petfolio';
const INVITE_CODE = 'PETFOLIO';

export const BloomMiningPromo = () => {
  const [open, setOpen] = useState(true);
  const [animate, setAnimate] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
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
      toast.success('Petfolio copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleMine = async () => {
    await copyCode();
    await openExternally();
    close();
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-5 transition-opacity duration-300 ${
        animate ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={close}
      />

      <div
        className={`relative z-10 w-full max-w-md rounded-3xl p-7 text-center bg-gradient-to-b from-[#1b1028] via-[#12091d] to-[#09050f] border border-purple-400/30 shadow-2xl shadow-purple-500/20 transition-all duration-300 ${
          animate ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <button
          onClick={close}
          className="absolute top-3 right-3 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-violet-500 flex items-center justify-center text-4xl shadow-lg shadow-purple-500/40 mb-5">
          🐾
        </div>

        <div className="inline-block px-3 py-1 rounded-full bg-purple-400/15 border border-purple-400/30 text-purple-300 text-xs font-bold tracking-wide mb-3">
          NEW ON PETFOLIO
        </div>

        <h2 className="font-display text-3xl font-bold text-white mb-2">
          Create Your Pet&apos;s{' '}
          <span className="bg-gradient-to-r from-purple-300 via-pink-400 to-violet-400 bg-clip-text text-transparent">
            Onchain Identity
          </span>
        </h2>

        <p className="text-white/70 text-sm leading-relaxed mb-5">
          Petfolio lets you create a profile for your pet and automatically
          launch a token via Clanker.
          <br />
          <br />
          Build a community, share updates, track market activity, and grow
          your pet&apos;s presence onchain.
        </p>

        <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/30 p-4 mb-5">
          <p className="text-white/60 text-xs uppercase tracking-wider mb-2">
            Featured Platform
          </p>

          <button
            onClick={copyCode}
            className="w-full flex items-center justify-center gap-2 text-xl font-bold text-purple-300 hover:text-purple-200 transition"
          >
            {INVITE_CODE}
            {copied ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5 opacity-60" />
            )}
          </button>
        </div>

        <Button
          onClick={handleMine}
          className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-violet-500 hover:from-purple-400 hover:to-violet-400 text-white font-bold py-6 rounded-full text-base gap-2 shadow-lg shadow-purple-500/40 border border-purple-300/40"
        >
          View Petfolio
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
