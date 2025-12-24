import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, ExternalLink, Share2, Loader2, Gift, RefreshCw } from 'lucide-react';
import sdk from '@farcaster/miniapp-sdk';
import { BLOOMERS_NFT_ADDRESS } from '@/config/wagmi';
import { parseEther, formatEther } from 'viem';
import { supabase } from '@/integrations/supabase/client';

interface BloomersMintProps {
  userPfp?: string;
  userFid?: number;
  username?: string;
  onMinted?: (imageUrl: string) => void;
}

type MintState = 'idle' | 'paying' | 'minted';

// The 5 spirit bloomers that rotate randomly
const SPIRIT_BLOOMERS = [
  '/bloomers/bloomer-purple-spirit.png',
  '/bloomers/bloomer-pink-spirit.png',
  '/bloomers/bloomer-green-spirit.png',
  '/bloomers/bloomer-red-spirit.png',
  '/bloomers/bloomer-gold-spirit.png',
];

// Get a random bloomer, excluding certain ones
const getRandomBloomer = (exclude: string[] = []): string => {
  const available = SPIRIT_BLOOMERS.filter(b => !exclude.includes(b));
  if (available.length === 0) {
    // If all excluded, pick any random one
    return SPIRIT_BLOOMERS[Math.floor(Math.random() * SPIRIT_BLOOMERS.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
};

const BloomersMint = ({ userPfp, userFid, username, onMinted }: BloomersMintProps) => {
  const [mintState, setMintState] = useState<MintState>('idle');
  const [currentBloomer, setCurrentBloomer] = useState<string>(() => getRandomBloomer());
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mintPrice, setMintPrice] = useState<string>('0.0004');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mintedBloomers, setMintedBloomers] = useState<string[]>([]);

  const displayImage = userPfp || 'https://api.dicebear.com/7.x/avataaars/svg?seed=bloomer';

  // Get user wallet, check discount eligibility, and clean up pending bloomers
  useEffect(() => {
    const initializeAndCleanup = async () => {
      try {
        if (sdk?.wallet?.ethProvider) {
          const accounts = await sdk.wallet.ethProvider.request({ 
            method: 'eth_requestAccounts' 
          }) as string[];
          
          if (accounts?.[0]) {
            const addr = accounts[0];
            setUserAddress(addr);
            
            // Clean up any pending bloomers (not minted) for this user
            const { error: deleteError } = await supabase
              .from('minted_bloomers')
              .delete()
              .eq('user_address', addr.toLowerCase())
              .is('tx_hash', null);
            
            if (deleteError) {
              console.log('Failed to clean pending bloomers:', deleteError);
            } else {
              console.log('Cleaned up pending bloomers');
            }
            
            // Get mint price for user
            try {
              const priceResult = await sdk.wallet.ethProvider.request({
                method: 'eth_call',
                params: [{
                  to: BLOOMERS_NFT_ADDRESS,
                  data: `0xa945bf80${addr.slice(2).padStart(64, '0')}`
                }, 'latest']
              }) as string;
              
              if (priceResult && priceResult !== '0x') {
                const priceInWei = BigInt(priceResult);
                const priceInEth = formatEther(priceInWei);
                setMintPrice(priceInEth);
                setHasDiscount(priceInWei === parseEther('0.0002'));
              }
            } catch (priceError) {
              console.log('Could not fetch mint price, using default:', priceError);
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };
    
    initializeAndCleanup();
  }, []);

  // Rotate to a different bloomer
  const handleRotate = () => {
    const newBloomer = getRandomBloomer([currentBloomer]);
    setCurrentBloomer(newBloomer);
  };

  // Mint the current Bloomer on-chain
  const handleMint = async () => {
    console.log('[Mint] Starting mint process...');

    if (!sdk?.wallet?.ethProvider) {
      console.error('[Mint] No ethProvider available');
      setError('Wallet not available. Please try again.');
      return;
    }

    setMintState('paying');
    setError(null);
    
    try {
      const provider = sdk.wallet.ethProvider;
      
      // Get user address
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (!accounts?.[0]) {
        throw new Error('No wallet connected');
      }

      const userAddr = accounts[0];

      // Switch to Base network
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }]
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
        }
      }

      // Use the mint price we already determined
      const mintPriceWei = parseEther(mintPrice);

      // Build transaction
      const txParams = {
        from: userAddr,
        to: BLOOMERS_NFT_ADDRESS,
        value: `0x${mintPriceWei.toString(16)}`,
        data: '0x1249c58b' // mint() function selector
      };

      // Send mint transaction
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      }) as string;

      console.log('[Mint] Transaction hash:', hash);
      setTxHash(hash);

      // Get full image URL for storage
      const fullImageUrl = `https://naughty-or-nice-wrapped.lovable.app${currentBloomer}`;

      // Save to database
      try {
        const { error: insertError } = await supabase.from('minted_bloomers').insert({
          user_address: userAddr.toLowerCase(),
          image_url: fullImageUrl,
          tx_hash: hash,
          fid: userFid
        });
        
        if (insertError) {
          console.error('[Mint] Failed to insert bloomer:', insertError);
        } else {
          console.log('[Mint] Saved bloomer to database');
        }
        
        // Get tokenId from transaction receipt logs
        let tokenId: number | null = null;
        try {
          let receipt = null;
          let attempts = 0;
          const maxAttempts = 30;
          
          while (!receipt && attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000));
            receipt = await provider.request({
              method: 'eth_getTransactionReceipt',
              params: [hash]
            }) as any;
            attempts++;
          }
          
          if (receipt?.logs) {
            const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
            const transferLog = receipt.logs.find((log: any) => 
              log.topics?.[0]?.toLowerCase() === transferTopic.toLowerCase()
            );
            
            if (transferLog?.topics?.[3]) {
              tokenId = parseInt(transferLog.topics[3], 16);
              console.log('[Mint] Got tokenId:', tokenId);
            }
          }
        } catch (receiptErr) {
          console.log('[Mint] Could not get receipt for tokenId:', receiptErr);
        }
        
        // Upload metadata if we got tokenId
        if (tokenId !== null) {
          const metadata = {
            name: `Bloomer #${tokenId}`,
            description: "A magical Bloomer creature from Naughty or Nice Wrapped.",
            image: fullImageUrl,
            external_url: "https://naughty-or-nice-wrapped.vercel.app/bloomers",
            attributes: [
              { trait_type: "Collection", value: "Naughty or Nice Wrapped" },
              { trait_type: "Season", value: "Christmas 2024" },
              { trait_type: "Minted By", value: userAddr }
            ]
          };
          
          const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
          await supabase.storage
            .from('bloomers-metadata')
            .upload(`${tokenId}.json`, metadataBlob, {
              contentType: 'application/json',
              upsert: true
            });
        }
        
        // Send notification
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              notification_type: 'bloomer_minted',
              username: username || `fid:${userFid}`,
              target_url: 'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped'
            }
          });
        } catch (notifyErr) {
          console.error('[Mint] Failed to send notification:', notifyErr);
        }
        
        // Track this minted bloomer
        setMintedBloomers(prev => [...prev, currentBloomer]);
        
        // Notify parent to refresh gallery
        onMinted?.(fullImageUrl);
      } catch (saveErr) {
        console.error('[Mint] Failed to save bloomer:', saveErr);
      }

      setMintState('minted');
    } catch (err: any) {
      console.error('[Mint] Error:', err);
      
      let errorMessage = 'Mint failed. Please try again.';
      if (err?.message?.includes('rejected') || err?.code === 4001) {
        errorMessage = 'Transaction was rejected.';
      } else if (err?.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH balance.';
      } else if (err?.message) {
        errorMessage = `Error: ${err.message.slice(0, 100)}`;
      }
      
      setError(errorMessage);
      setMintState('idle');
    }
  };

  // After minting, allow minting another with a different bloomer
  const handleMintAnother = () => {
    const newBloomer = getRandomBloomer([currentBloomer]);
    setCurrentBloomer(newBloomer);
    setTxHash(null);
    setMintState('idle');
  };

  const handleShare = async () => {
    const shareText = `✨ My Bloomer just bloomed into existence! ✨

Fresh off the blockchain from naughty-or-nice-wrapped by @uniquebeing404

Your turn to bloom 🌸👇`;

    try {
      if (sdk?.actions?.composeCast) {
        const fullImageUrl = `https://naughty-or-nice-wrapped.lovable.app${currentBloomer}`;
        await sdk.actions.composeCast({
          text: shareText,
          embeds: [
            fullImageUrl,
            'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped'
          ]
        });
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <section id="mint-section" className="py-16 px-6">
      <div className="max-w-md mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl font-bold text-christmas-snow mb-2">
            Mint Your <span className="text-christmas-gold">Bloomer</span>
          </h2>
          <p className="text-christmas-snow/60 text-sm">
            Collect magical Bloomers. Each mint reveals a unique spirit!
          </p>
        </div>

        {/* Preview card */}
        <div className="christmas-card p-6 border border-christmas-gold/20 mb-6">
          {/* Bloomer Preview */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-christmas-gold/30">
                <img 
                  src={displayImage} 
                  alt="Your avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 text-lg">✨</div>
            </div>
            
            <div className="text-2xl text-christmas-gold animate-pulse">→</div>
            
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border-2 border-christmas-gold/30 overflow-hidden">
              <img src={currentBloomer} alt="Your Bloomer" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Large Bloomer Preview */}
          <div className="mb-6">
            <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden border-2 border-christmas-gold/40 shadow-lg">
              <img 
                src={currentBloomer} 
                alt="Your Bloomer" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            
            {/* Rotate button */}
            {mintState === 'idle' && (
              <div className="flex justify-center mt-3">
                <button
                  onClick={handleRotate}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-christmas-gold/20 hover:bg-christmas-gold/30 border border-christmas-gold/30 text-christmas-gold text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Show Different Bloomer
                </button>
              </div>
            )}
          </div>

          {/* Price */}
          {mintState !== 'minted' && (
            <div className="text-center mb-6">
              <p className="text-christmas-snow/50 text-xs">Mint Price</p>
              <div className="flex items-center justify-center gap-2">
                <p className="font-display text-2xl text-christmas-gold font-bold">{mintPrice} ETH</p>
                {hasDiscount && (
                  <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    50% OFF
                  </span>
                )}
              </div>
              <p className="text-christmas-snow/40 text-xs">on Base</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* Action Buttons based on state */}
          {mintState === 'idle' && (
            <Button 
              onClick={handleMint}
              className="w-full bg-gradient-to-r from-christmas-gold to-amber-600 hover:from-christmas-gold/90 hover:to-amber-600/90 text-christmas-pine py-6 rounded-xl font-bold text-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Mint for {mintPrice} ETH
            </Button>
          )}

          {mintState === 'paying' && (
            <Button 
              disabled
              className="w-full bg-gradient-to-r from-christmas-gold to-amber-600 text-christmas-pine py-6 rounded-xl font-bold text-lg"
            >
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Confirm in Wallet...
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

              <Button 
                onClick={handleMintAnother}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-xl font-bold"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Mint Another Bloomer
              </Button>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/20 rounded-xl p-4 text-center border border-christmas-gold/10">
            <Sparkles className="w-6 h-6 text-christmas-gold mx-auto mb-2" />
            <p className="text-christmas-snow/80 text-sm font-semibold">5 Spirits</p>
            <p className="text-christmas-snow/50 text-xs">To Collect</p>
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
