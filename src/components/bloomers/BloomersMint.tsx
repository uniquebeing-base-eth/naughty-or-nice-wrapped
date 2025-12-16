import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Upload, ExternalLink, Share2, Loader2, Gift, RefreshCw } from 'lucide-react';
import sdk from '@farcaster/miniapp-sdk';
import { BLOOMERS_NFT_ADDRESS } from '@/config/wagmi';
import { parseEther, formatEther } from 'viem';
import { supabase } from '@/integrations/supabase/client';

interface BloomersMintProps {
  userPfp?: string;
  onMinted?: (imageUrl: string) => void;
}

type MintState = 'idle' | 'generating' | 'preview' | 'paying' | 'minted';

const BloomersMint = ({ userPfp, onMinted }: BloomersMintProps) => {
  const [mintState, setMintState] = useState<MintState>('idle');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [generatedBloomer, setGeneratedBloomer] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mintPrice, setMintPrice] = useState<string>('0.0004');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingBloomerId, setPendingBloomerId] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImage = customImage || userPfp || 'https://api.dicebear.com/7.x/avataaars/svg?seed=bloomer';

  // Get user wallet, check discount eligibility, and load pending bloomer
  useEffect(() => {
    const checkWalletAndDiscount = async () => {
      try {
        if (sdk?.wallet?.ethProvider) {
          const accounts = await sdk.wallet.ethProvider.request({ 
            method: 'eth_requestAccounts' 
          }) as string[];
          
          if (accounts?.[0]) {
            const addr = accounts[0];
            setUserAddress(addr);
            
            // Check for pending bloomer (generated but not minted)
            const { data: pendingBloomer } = await supabase
              .from('minted_bloomers')
              .select('*')
              .eq('user_address', addr.toLowerCase())
              .is('tx_hash', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (pendingBloomer) {
              console.log('Found pending bloomer:', pendingBloomer.image_url);
              // Preload the image before showing
              const img = new Image();
              img.onload = () => {
                setGeneratedBloomer(pendingBloomer.image_url);
                setPendingBloomerId(pendingBloomer.id);
                setImageLoaded(true);
                setMintState('preview');
              };
              img.onerror = () => {
                console.error('Failed to load pending bloomer image');
                // If image fails, don't show it - let user regenerate
              };
              img.src = pendingBloomer.image_url;
            }
            
            // Get mint price for user - wrap in try-catch as some providers don't support eth_call
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
              console.log('Could not fetch mint price (provider may not support eth_call), using default:', priceError);
              // Use default price - discount check will happen during mint
            }
          }
        }
      } catch (error) {
        console.error('Failed to check wallet:', error);
      }
    };
    
    checkWalletAndDiscount();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
        // Reset state when new image uploaded
        setGeneratedBloomer(null);
        setMintState('idle');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Step 1: Generate the Bloomer using AI
  const handleGenerate = async () => {
    setMintState('generating');
    setError(null);
    setImageLoaded(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-bloomer', {
        body: { 
          sourceImage: displayImage,
          userAddress: userAddress
        }
      });

      if (error) throw error;
      
      if (data?.imageUrl) {
        // Preload the image before showing preview
        const img = new Image();
        img.onload = () => {
          setGeneratedBloomer(data.imageUrl);
          setImageLoaded(true);
          setMintState('preview');
        };
        img.onerror = () => {
          console.error('Failed to load generated image');
          setError('Failed to load Bloomer image. Please try again.');
          setMintState('idle');
        };
        img.src = data.imageUrl;
      } else {
        throw new Error('No image generated');
      }
    } catch (err) {
      console.error('Generation failed:', err);
      setError('Failed to generate Bloomer. Please try again.');
      setMintState('idle');
    }
  };

  // Step 2: Mint the generated Bloomer on-chain
  const handleMint = async () => {
    if (!generatedBloomer) {
      setError('Please generate a Bloomer first');
      return;
    }

    console.log('[Mint] Starting mint process...');
    console.log('[Mint] SDK available:', !!sdk);
    console.log('[Mint] SDK wallet:', !!sdk?.wallet);
    console.log('[Mint] ethProvider:', !!sdk?.wallet?.ethProvider);

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
      console.log('[Mint] Requesting accounts...');
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      console.log('[Mint] Accounts received:', accounts);
      
      if (!accounts?.[0]) {
        throw new Error('No wallet connected');
      }

      const userAddr = accounts[0];
      console.log('[Mint] User address:', userAddr);

      // Switch to Base network
      console.log('[Mint] Switching to Base network...');
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }]
        });
        console.log('[Mint] Network switch successful');
      } catch (switchError: any) {
        console.log('[Mint] Network switch error:', switchError);
        if (switchError.code === 4902) {
          console.log('[Mint] Adding Base network...');
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
      console.log('[Mint] Mint price in Wei:', mintPriceWei.toString());
      console.log('[Mint] Contract address:', BLOOMERS_NFT_ADDRESS);

      // Build transaction
      const txParams = {
        from: userAddr,
        to: BLOOMERS_NFT_ADDRESS,
        value: `0x${mintPriceWei.toString(16)}`,
        data: '0x1249c58b' // mint() function selector
      };
      
      console.log('[Mint] Transaction params:', JSON.stringify(txParams, null, 2));

      // Send mint transaction
      console.log('[Mint] Sending transaction...');
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      }) as string;

      console.log('[Mint] Transaction hash:', hash);
      setTxHash(hash);

      // Update the pending bloomer with the tx_hash, or insert if no pending
      if (generatedBloomer) {
        try {
          // First, try to find and update any pending bloomer for this user with this image
          const { data: existingPending } = await supabase
            .from('minted_bloomers')
            .select('id')
            .eq('user_address', userAddr.toLowerCase())
            .eq('image_url', generatedBloomer)
            .is('tx_hash', null)
            .single();

          if (existingPending) {
            // Update existing pending bloomer
            const { error: updateError } = await supabase
              .from('minted_bloomers')
              .update({ tx_hash: hash })
              .eq('id', existingPending.id);
            
            if (updateError) {
              console.error('[Mint] Failed to update pending bloomer:', updateError);
            } else {
              console.log('[Mint] Updated pending bloomer with tx_hash');
            }
          } else {
            // Insert new minted bloomer
            const { error: insertError } = await supabase.from('minted_bloomers').insert({
              user_address: userAddr.toLowerCase(),
              image_url: generatedBloomer,
              tx_hash: hash
            });
            
            if (insertError) {
              console.error('[Mint] Failed to insert bloomer:', insertError);
            } else {
              console.log('[Mint] Saved new bloomer to database');
            }
          }
          
          // Get tokenId from transaction receipt logs (Transfer event)
          let tokenId: number | null = null;
          try {
            const receipt = await provider.request({
              method: 'eth_getTransactionReceipt',
              params: [hash]
            }) as any;
            
            if (receipt?.logs) {
              // Transfer event topic: keccak256("Transfer(address,address,uint256)")
              const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
              const transferLog = receipt.logs.find((log: any) => 
                log.topics?.[0]?.toLowerCase() === transferTopic.toLowerCase()
              );
              
              if (transferLog?.topics?.[3]) {
                tokenId = parseInt(transferLog.topics[3], 16);
                console.log('[Mint] Got tokenId from Transfer event:', tokenId);
              }
            }
          } catch (receiptErr) {
            console.log('[Mint] Could not get receipt for tokenId:', receiptErr);
          }
          
          // Upload metadata if we got tokenId
          if (tokenId !== null) {
            console.log('[Mint] Uploading metadata for tokenId:', tokenId);
            
            const metadata = {
              name: `Bloomer #${tokenId}`,
              description: "A magical Bloomer creature from Naughty or Nice Wrapped. Each Bloomer is uniquely generated based on its owner's profile, making it a one-of-a-kind digital companion.",
              image: generatedBloomer,
              external_url: "https://naughty-or-nice-wrapped.vercel.app/bloomers",
              attributes: [
                { trait_type: "Collection", value: "Naughty or Nice Wrapped" },
                { trait_type: "Season", value: "Christmas 2024" },
                { trait_type: "Minted By", value: userAddr }
              ]
            };
            
            const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
            const { error: uploadError } = await supabase.storage
              .from('bloomers-metadata')
              .upload(`${tokenId}.json`, metadataBlob, {
                contentType: 'application/json',
                upsert: true
              });
            
            if (uploadError) {
              console.error('[Mint] Failed to upload metadata:', uploadError);
            } else {
              console.log(`[Mint] Uploaded metadata for token ${tokenId}`);
            }
          } else {
            console.log('[Mint] Could not determine tokenId, skipping metadata upload');
          }
          
          // Notify parent to refresh gallery
          onMinted?.(generatedBloomer);
          setPendingBloomerId(null);
          // Reset custom image back to PFP after minting
          setCustomImage(null);
        } catch (saveErr) {
          console.error('[Mint] Failed to save bloomer:', saveErr);
        }
      }

      setMintState('minted');
    } catch (err: any) {
      console.error('[Mint] Error:', err);
      console.error('[Mint] Error message:', err?.message);
      console.error('[Mint] Error code:', err?.code);
      console.error('[Mint] Error data:', err?.data);
      
      // More specific error messages
      let errorMessage = 'Mint failed. Please try again.';
      if (err?.message?.includes('rejected') || err?.code === 4001) {
        errorMessage = 'Transaction was rejected.';
      } else if (err?.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH balance.';
      } else if (err?.message) {
        errorMessage = `Error: ${err.message.slice(0, 100)}`;
      }
      
      setError(errorMessage);
      setMintState('preview');
    }
  };

  const handleRegenerate = async () => {
    // Delete the pending bloomer from database
    if (pendingBloomerId) {
      await supabase
        .from('minted_bloomers')
        .delete()
        .eq('id', pendingBloomerId);
      setPendingBloomerId(null);
    }
    setGeneratedBloomer(null);
    setCustomImage(null); // Reset to PFP
    setImageLoaded(false);
    setTxHash(null);
    setMintState('idle');
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
            Mint your own magical Bloomer. Unlimited variations.
          </p>
          <p className="text-christmas-snow/40 text-xs mt-1">
            Each mint reveals a new form
          </p>
        </div>

        {/* Preview card */}
        <div className="christmas-card p-6 border border-christmas-gold/20 mb-6">
          {/* Image Preview */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-christmas-gold/30">
                <img 
                  src={displayImage} 
                  alt="Source avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 text-lg">✨</div>
            </div>
            
            <div className="text-2xl text-christmas-gold animate-pulse">→</div>
            
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

          {/* Generated Bloomer Large Preview */}
          {generatedBloomer && (mintState === 'preview' || mintState === 'paying' || mintState === 'minted') && (
            <div className="mb-6">
              <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden border-2 border-christmas-gold/40 shadow-lg">
                <img 
                  src={generatedBloomer} 
                  alt="Your Generated Bloomer" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              <p className="text-center text-christmas-gold text-sm mt-3 font-medium">
                ✨ Your Bloomer is ready! ✨
              </p>
            </div>
          )}

          {!generatedBloomer && (
            <>
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
            </>
          )}

          {/* Custom Image Upload - only show when not generated */}
          {mintState === 'idle' && (
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
            </div>
          )}

          {/* Price - show when preview or paying */}
          {(mintState === 'preview' || mintState === 'paying') && (
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
              onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-6 rounded-xl font-bold text-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate My Bloomer
            </Button>
          )}

          {mintState === 'generating' && (
            <Button 
              disabled
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-6 rounded-xl font-bold text-lg"
            >
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating Your Bloomer...
            </Button>
          )}

          {mintState === 'preview' && (
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
                onClick={handleRegenerate}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-xl font-bold"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Bloom My Bloomer
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
