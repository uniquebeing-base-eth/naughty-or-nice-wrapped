
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const Share = () => {
  const [searchParams] = useSearchParams();
  
  const username = searchParams.get('username') || 'User';
  const score = parseInt(searchParams.get('score') || '0');
  const isNice = searchParams.get('nice') === 'true';
  const badge = searchParams.get('badge') || '';
  const pfp = searchParams.get('pfp') || '';
  const imageUrl = searchParams.get('image') || '';

  const verdict = isNice ? 'NICE' : 'NAUGHTY';
  const emoji = isNice ? '😇' : '😈';

  // Redirect to the mini app after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = 'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped';
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Helmet>
        <title>{`@${username} is ${score}% ${verdict} ${emoji} | Naughty or Nice Wrapped 2025`}</title>
        <meta name="description" content={`${badge} - @${username} scored ${score}% on the Naughty or Nice scale! Find out your 2025 Farcaster verdict.`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`@${username} is ${score}% ${verdict} ${emoji}`} />
        <meta property="og:description" content={`${badge} - Find out if you've been Naughty or Nice on Farcaster in 2025!`} />
        <meta property="og:image" content={imageUrl || 'https://naughty-or-nice-wrapped.vercel.app/preview-image.png'} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`@${username} is ${score}% ${verdict} ${emoji}`} />
        <meta name="twitter:description" content={`${badge} - Find out if you've been Naughty or Nice on Farcaster in 2025!`} />
        <meta name="twitter:image" content={imageUrl || 'https://naughty-or-nice-wrapped.vercel.app/preview-image.png'} />
        
        {/* Farcaster Frame - this is what displays the image in the cast */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={imageUrl || 'https://naughty-or-nice-wrapped.vercel.app/preview-image.png'} />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        <meta property="fc:frame:button:1" content="Get Your Wrapped 🎄" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped" />
        
        {/* Farcaster Mini App Embed - newer format */}
        <meta name="fc:miniapp" content={JSON.stringify({
          version: "1",
          imageUrl: imageUrl || 'https://naughty-or-nice-wrapped.vercel.app/preview-image.png',
          button: {
            title: "Get Your Wrapped 🎄",
            action: {
              type: "launch_miniapp",
              url: "https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped",
              name: "Naughty or Nice Wrapped",
              splashImageUrl: "https://naughty-or-nice-wrapped.vercel.app/splash-icon.png",
              splashBackgroundColor: "#1a472a"
            }
          }
        })} />
      </Helmet>

      <div className="min-h-screen bg-christmas-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-pulse mb-6">
          <span className="text-6xl">{emoji}</span>
        </div>
        <h1 className="text-2xl font-bold text-christmas-snow mb-2">
          @{username} is {score}% {verdict}!
        </h1>
        <p className="text-christmas-gold mb-4">{badge}</p>
        <p className="text-christmas-snow/70 text-sm">
          Redirecting to the mini app...
        </p>
      </div>
    </>
  );
};

export default Share;
