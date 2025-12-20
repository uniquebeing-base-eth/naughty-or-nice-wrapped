import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Trophy, Coins, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  user_address: string;
  fid: number | null;
  bloomer_count: number;
  bloom_points: number;
  tokens: number;
  pfp_url?: string;
  username?: string;
}

const POINTS_PER_BLOOMER = 300;
const TOKENS_MULTIPLIER = 50;

const BloomersLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      // Get all minted bloomers with fid
      const { data, error } = await supabase
        .from('minted_bloomers')
        .select('user_address, fid')
        .not('tx_hash', 'is', null);

      if (error) throw error;

      // Count bloomers per user and track their fid
      const userCounts: Record<string, { count: number; fid: number | null }> = {};
      data?.forEach(item => {
        const addr = item.user_address.toLowerCase();
        if (!userCounts[addr]) {
          userCounts[addr] = { count: 0, fid: item.fid };
        }
        userCounts[addr].count += 1;
        // Keep the fid if we have one
        if (item.fid) userCounts[addr].fid = item.fid;
      });

      // Get unique fids to fetch user data
      const fids = Object.values(userCounts)
        .map(u => u.fid)
        .filter((fid): fid is number => fid !== null);

      // Fetch user data from wrapped_stats
      let userDataMap: Record<number, { username: string; pfpUrl: string }> = {};
      if (fids.length > 0) {
        const { data: userData } = await supabase
          .from('wrapped_stats')
          .select('fid, user_data')
          .in('fid', fids);

        userData?.forEach((item: any) => {
          if (item.fid && item.user_data) {
            userDataMap[item.fid] = {
              username: item.user_data.username || item.user_data.displayName,
              pfpUrl: item.user_data.pfpUrl,
            };
          }
        });
      }

      // Convert to leaderboard entries and sort by count
      const entries: LeaderboardEntry[] = Object.entries(userCounts)
        .map(([address, data]) => {
          const userData = data.fid ? userDataMap[data.fid] : undefined;
          return {
            user_address: address,
            fid: data.fid,
            bloomer_count: data.count,
            bloom_points: data.count * POINTS_PER_BLOOMER,
            tokens: data.count * POINTS_PER_BLOOMER * TOKENS_MULTIPLIER,
            username: userData?.username,
            pfp_url: userData?.pfpUrl,
          };
        })
        .sort((a, b) => b.bloomer_count - a.bloomer_count)
        .slice(0, 50); // Top 50

      setLeaderboard(entries);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch on open and set up auto-refresh every 30 seconds
    if (isOpen) {
      fetchLeaderboard();
      const interval = setInterval(fetchLeaderboard, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Also refresh when component mounts to ensure fresh data
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', highlight: true };
    if (rank === 2) return { emoji: '🥈', highlight: true };
    if (rank === 3) return { emoji: '🥉', highlight: true };
    return { emoji: `#${rank}`, highlight: false };
  };

  const handleUserClick = (entry: LeaderboardEntry) => {
    if (entry.username) {
      window.open(`https://warpcast.com/${entry.username}`, '_blank');
    } else {
      window.open(`https://basescan.org/address/${entry.user_address}`, '_blank');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline"
          className="bg-transparent border-2 border-christmas-gold/50 text-christmas-gold hover:bg-christmas-gold/10 px-6 py-6 rounded-full font-bold text-lg hover:scale-105 transition-transform"
        >
          <Trophy className="w-5 h-5 mr-2" />
          Leaderboard
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] bg-gradient-to-b from-[#2d1f3d] to-[#1a0f2e] border-t-2 border-christmas-gold/30 rounded-t-3xl"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="text-center">
            <span className="font-display text-2xl text-christmas-gold flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6" />
              Bloom Leaderboard
            </span>
            <p className="text-christmas-snow/50 text-sm font-normal mt-1">
              Top Bloomer collectors
            </p>
          </SheetTitle>
        </SheetHeader>

        {/* Token Info Banner */}
        <div className="christmas-card p-4 mb-5 border border-christmas-gold/30 bg-gradient-to-r from-purple-900/40 to-pink-900/40">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-christmas-gold/20 flex items-center justify-center flex-shrink-0">
              <Coins className="w-5 h-5 text-christmas-gold" />
            </div>
            <div>
              <p className="text-christmas-gold font-bold text-sm">$BLOOM Token Airdrop 🎁</p>
              <p className="text-christmas-snow/70 text-xs mt-1 leading-relaxed">
                Token launching soon! Mint more Bloomers to increase your allocation. 
                Claim your tokens when we go live!
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="overflow-y-auto max-h-[calc(85vh-260px)] space-y-2 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Sparkles className="w-10 h-10 text-christmas-gold animate-pulse" />
              <p className="text-christmas-snow/60 text-sm">Loading rankings...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🌸</div>
              <p className="text-christmas-snow/60">No minters yet. Be the first!</p>
            </div>
          ) : (
            leaderboard.map((entry, index) => {
              const rank = getRankDisplay(index + 1);
              return (
                <div 
                  key={entry.user_address}
                  className={`christmas-card p-3 border transition-all hover:scale-[1.01] cursor-pointer ${
                    rank.highlight 
                      ? 'border-christmas-gold/50 bg-gradient-to-r from-christmas-gold/10 to-transparent' 
                      : 'border-christmas-gold/15 hover:border-christmas-gold/30'
                  }`}
                  onClick={() => handleUserClick(entry)}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className={`w-8 text-center flex-shrink-0 ${rank.highlight ? 'text-xl' : 'text-christmas-snow/50 text-sm font-medium'}`}>
                      {rank.emoji}
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Profile Picture */}
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-2 border-christmas-gold/30">
                        {entry.pfp_url ? (
                          <img 
                            src={entry.pfp_url} 
                            alt={entry.username || 'User'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-sm">🌸</span>
                          </div>
                        )}
                      </div>

                      {/* Username/Address */}
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold truncate ${entry.username ? 'text-christmas-snow' : 'text-christmas-snow/70'}`}>
                          {entry.username ? `@${entry.username}` : formatAddress(entry.user_address)}
                        </p>
                        <p className="text-christmas-snow/40 text-xs">
                          {entry.bloomer_count} Bloomer{entry.bloomer_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-purple-400 font-bold text-sm">{entry.bloom_points.toLocaleString()}</p>
                        <p className="text-christmas-snow/30 text-[10px]">Points</p>
                      </div>
                      <div className="text-center">
                        <p className="text-christmas-gold font-bold">{entry.tokens.toLocaleString()}</p>
                        <p className="text-christmas-snow/30 text-[10px]">$BLOOM</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-4 left-0 right-0 px-6">
          <div className="text-center space-y-0.5">
            <p className="text-christmas-snow/30 text-xs">
              🌸 1 Bloomer = {POINTS_PER_BLOOMER} Points • 1 Point = {TOKENS_MULTIPLIER} $BLOOM
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BloomersLeaderboard;
