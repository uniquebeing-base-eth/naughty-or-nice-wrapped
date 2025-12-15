import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Lock, Upload, ExternalLink, Share2, Loader2 } from 'lucide-react';
import sdk from '@farcaster/miniapp-sdk';

interface BloomersMintProps {
  userPfp?: string;
}

type MintState = 'idle' | 'paying' | 'generating' | 'minted';

const BloomersMint = ({ userPfp }: BloomersMintProps) => {
  const [mintState, setMintState] = useState<MintState>('idle');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [generatedBloomer, setGeneratedBloomer] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImage = customImage || userPfp || 'https://api.dicebear.com/7.x/avataaars/svg?seed=bloomer';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // This will be enabled when minting goes live
  const handleMint = async () => {
    // Flow: Pay → Generate → Mint
    setMintState('paying');
    
    try {
      // 1. Process payment transaction
      // await processPayment();
      
      // 2. Generate Bloomer with AI based on traits
      setMintState('generating');
      // const bloomer = await generateBloomer(displayImage);
      // setGeneratedBloomer(bloomer);
      
      // 3. Mint NFT
      // const hash = await mintNFT(bloomer);
      // setTxHash(hash);
      
      setMintState('minted');
    } catch (error) {
      console.error('Mint failed:', error);
      setMintState('idle');
    }
  };

  const handleShare = async () => {
    const shareText = `✨ My Bloomer just bloomed into existence! ✨

Fresh off the blockchain from naughty-or-nice-wrapped by @uniquebeing404

Your turn to bloom 🌸👇`;

    try {
      if (sdk?.actions?.composeCast) {
        await sdk.actions.composeCast({
          text: shareText,
          embeds: [
            generatedBloomer || displayImage,
            'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped'
          ]
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const mintingEnabled = false; // Toggle when ready to go live

  return (
    <section className="py-16 px-6">
      <div className="max-w-md mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl font-bold text-christmas-snow mb-2">
            Mint Your <span className="text-christmas-gold">Bloomer</span>
          </h2>
          <p className="text-christmas-snow/60 text-sm">
            Mint your own magical Bloomer. Unlimited variations.
          </p>
          <p className="text-christmas-snow/40 text-xs mt-1">
            Each mint reveals a new form
          </p>
        </div>

        {/* Preview card */}
        <div className="christmas-card p-6 border border-christmas-gold/20 mb-6">
          {/* User DNA preview */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              {/* Source Image (User PFP or Custom Upload) */}
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-christmas-gold/30">
                <img 
                  src={displayImage} 
                  alt="Source avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 text-lg">✨</div>
            </div>
            
            {/* Arrow */}
            <div className="text-2xl text-christmas-gold animate-pulse">→</div>
            
            {/* Bloomer preview */}
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border-2 border-christmas-gold/30 overflow-hidden">
              {generatedBloomer ? (
                <img src={generatedBloomer} alt="Your Bloomer" className="w-full h-full object-cover" />
              ) : (
                <>
                  <span className="text-3xl">🌸</span>
                  <div className="absolute -bottom-1 -right-1 text-lg">🦋</div>
                </>
              )}
            </div>
          </div>

          <p className="text-center text-christmas-snow/60 text-sm mb-4">
            Your profile traits will shape your Bloomer's appearance
          </p>

          {/* DNA Traits */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <span className="px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium">
              Color DNA
            </span>
            <span className="px-3 py-1.5 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-medium">
              Pattern DNA
            </span>
            <span className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium">
              Mood DNA
            </span>
          </div>

          {/* Custom Image Upload */}
          <div className="mb-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={handleUploadClick}
              className="w-full py-3 rounded-xl border border-dashed border-christmas-gold/30 bg-muted/10 hover:bg-muted/20 transition-colors flex items-center justify-center gap-2 text-christmas-snow/70 hover:text-christmas-snow"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm">
                {customImage ? 'Change Custom Image' : 'Upload Custom Image for Traits'}
              </span>
            </button>
            {customImage && (
              <p className="text-center text-christmas-snow/50 text-xs mt-2">
                Using custom image for trait extraction
              </p>
            )}
          </div>

          {/* Price */}
          <div className="text-center mb-6">
            <p className="text-christmas-snow/50 text-xs">Mint Price</p>
            <p className="font-display text-2xl text-christmas-gold font-bold">0.0004 ETH</p>
            <p className="text-christmas-snow/40 text-xs">on Base</p>
          </div>

          {/* Mint States */}
          {mintState === 'idle' && (
            <Button 
              disabled={!mintingEnabled}
              onClick={handleMint}
              className="w-full bg-gradient-to-r from-christmas-gold/30 to-amber-600/30 text-christmas-snow/60 py-6 rounded-xl font-bold text-lg border border-christmas-gold/30 cursor-not-allowed disabled:opacity-70"
            >
              {mintingEnabled ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Pay to Mint
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Minting Opens Soon 🎄
                </>
              )}
            </Button>
          )}

          {mintState === 'paying' && (
            <Button 
              disabled
              className="w-full bg-gradient-to-r from-christmas-gold to-amber-600 text-christmas-pine py-6 rounded-xl font-bold text-lg"
            >
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Confirm Payment...
            </Button>
          )}

          {mintState === 'generating' && (
            <Button 
              disabled
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-6 rounded-xl font-bold text-lg"
            >
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating Your Bloomer...
            </Button>
          )}

          {mintState === 'minted' && (
            <div className="space-y-3">
              <div className="text-center mb-4">
                <span className="text-2xl">🎉</span>
                <p className="text-christmas-gold font-bold text-lg">Minted!</p>
              </div>
              
              <Button 
                onClick={() => window.open(`https://basescan.org/tx/${txHash}`, '_blank')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-bold"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Basescan
              </Button>
              
              <Button 
                onClick={handleShare}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-bold"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share on Farcaster
              </Button>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/20 rounded-xl p-4 text-center border border-christmas-gold/10">
            <Sparkles className="w-6 h-6 text-christmas-gold mx-auto mb-2" />
            <p className="text-christmas-snow/80 text-sm font-semibold">Unlimited</p>
            <p className="text-christmas-snow/50 text-xs">Variations</p>
          </div>
          <div className="bg-muted/20 rounded-xl p-4 text-center border border-christmas-gold/10">
            <span className="text-2xl">🎁</span>
            <p className="text-christmas-snow/80 text-sm font-semibold mt-1">Rare Traits</p>
            <p className="text-christmas-snow/50 text-xs">To Discover</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BloomersMint;
