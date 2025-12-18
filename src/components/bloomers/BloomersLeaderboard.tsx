import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Trophy, Coins, Sparkles, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  user_address: string;
  bloomer_count: number;
  bloom_points: number;
  tokens: number;
  pfp_url?: string;
  username?: string;
}

const POINTS_PER_BLOOMER = 300;
const TOKENS_MULTIPLIER = 10;

const BloomersLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      // Get all minted bloomers grouped by user
      const { data, error } = await supabase
        .from('minted_bloomers')
        .select('user_address')
        .not('tx_hash', 'is', null);

      if (error) throw error;

      // Count bloomers per user
      const userCounts: Record<string, number> = {};
      data?.forEach(item => {
        const addr = item.user_address.toLowerCase();
        userCounts[addr] = (userCounts[addr] || 0) + 1;
      });

      // Convert to leaderboard entries and sort by count
      const entries: LeaderboardEntry[] = Object.entries(userCounts)
        .map(([address, count]) => ({
          user_address: address,
          bloomer_count: count,
          bloom_points: count * POINTS_PER_BLOOMER,
          tokens: count * POINTS_PER_BLOOMER * TOKENS_MULTIPLIER,
        }))
        .sort((a, b) => b.bloomer_count - a.bloomer_count)
        .slice(0, 50); // Top 50

      // Try to fetch user data from wrapped_stats
      const addresses = entries.map(e => e.user_address);
      const { data: userData } = await supabase
        .from('wrapped_stats')
        .select('user_data');

      // Create a map of usernames/pfps if available
      const userMap: Record<string, { pfp?: string; username?: string }> = {};
      userData?.forEach((item: any) => {
        if (item.user_data?.username) {
          // Store by username for now
          userMap[item.user_data.username.toLowerCase()] = {
            pfp: item.user_data.pfpUrl,
            username: item.user_data.username,
          };
        }
      });

      setLeaderboard(entries);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
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
          </SheetTitle>
        </SheetHeader>

        {/* Token Info Banner */}
        <div className="christmas-card p-4 mb-6 border border-purple-500/30 bg-purple-900/20">
          <div className="flex items-start gap-3">
            <Coins className="w-6 h-6 text-christmas-gold flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-christmas-snow font-semibold text-sm">$BLOOM Token Airdrop</p>
              <p className="text-christmas-snow/60 text-xs mt-1">
                Token launching soon! Your tokens will be claimable when the token goes live. 
                Keep minting to increase your allocation! 🚀
              </p>
            </div>
          </div>
        </div>

        {/* Stats Legend */}
        <div className="grid grid-cols-4 gap-2 mb-4 px-2 text-center">
          <div className="text-christmas-snow/50 text-xs font-medium">Rank</div>
          <div className="text-christmas-snow/50 text-xs font-medium">Bloomers</div>
          <div className="text-christmas-snow/50 text-xs font-medium">Points</div>
          <div className="text-christmas-snow/50 text-xs font-medium">$BLOOM</div>
        </div>

        {/* Leaderboard List */}
        <div className="overflow-y-auto max-h-[calc(85vh-280px)] space-y-2 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Sparkles className="w-8 h-8 text-christmas-gold animate-pulse" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-christmas-snow/60">No minters yet. Be the first!</p>
            </div>
          ) : (
            leaderboard.map((entry, index) => (
              <div 
                key={entry.user_address}
                className={`christmas-card p-3 border ${
                  index < 3 
                    ? 'border-christmas-gold/40 bg-christmas-gold/5' 
                    : 'border-christmas-gold/10'
                }`}
              >
                <div className="grid grid-cols-4 gap-2 items-center">
                  {/* Rank & User */}
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${index < 3 ? 'text-2xl' : 'text-christmas-snow/60 text-sm'}`}>
                      {getRankEmoji(index + 1)}
                    </span>
                    <a 
                      href={`https://basescan.org/address/${entry.user_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-christmas-gold transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs">
                        🌸
                      </div>
                      <span className="text-christmas-snow/80 text-xs truncate max-w-[60px]">
                        {formatAddress(entry.user_address)}
                      </span>
                    </a>
                  </div>

                  {/* Bloomers Count */}
                  <div className="text-center">
                    <span className="text-christmas-snow font-bold">{entry.bloomer_count}</span>
                  </div>

                  {/* Bloom Points */}
                  <div className="text-center">
                    <span className="text-purple-400 font-semibold text-sm">
                      {entry.bloom_points.toLocaleString()}
                    </span>
                  </div>

                  {/* Token Allocation */}
                  <div className="text-center">
                    <span className="text-christmas-gold font-bold text-sm">
                      {entry.tokens.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-6 left-0 right-0 px-6">
          <div className="text-center text-christmas-snow/40 text-xs space-y-1">
            <p>1 Bloomer = {POINTS_PER_BLOOMER} Bloom Points</p>
            <p>1 Bloom Point = {TOKENS_MULTIPLIER} $BLOOM Tokens</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BloomersLeaderboard;
