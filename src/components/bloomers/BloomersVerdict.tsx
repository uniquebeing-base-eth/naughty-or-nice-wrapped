
import { UserVerdict } from '@/pages/Bloomers';

interface BloomersVerdictProps {
  verdict: UserVerdict;
}

const BloomersVerdict = ({ verdict }: BloomersVerdictProps) => {
  // Calculate meter position (0-100)
  const meterPosition = verdict.isNice ? 50 + (verdict.score / 2) : 50 - ((100 - verdict.score) / 2);

  return (
    <section className="py-16 px-6">
      <div className="max-w-md mx-auto">
        {/* Title */}
        <h2 className="font-display text-3xl font-bold text-center text-christmas-snow mb-8">
          Your Winter <span className="text-christmas-gold">Verdict</span>
        </h2>

        {/* Meter */}
        <div className="christmas-card p-6 border border-christmas-gold/20 mb-6">
          {/* Labels */}
          <div className="flex justify-between text-sm mb-3">
            <span className="text-christmas-red font-semibold">Naughty</span>
            <span className="text-christmas-green font-semibold">Nice</span>
          </div>

          {/* Meter bar */}
          <div className="relative h-4 rounded-full bg-gradient-to-r from-christmas-red/30 via-christmas-gold/30 to-christmas-green/30 overflow-hidden">
            {/* Gradient fill */}
            <div className="absolute inset-0 bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green opacity-60" />
            
            {/* Indicator */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-christmas-gold transition-all duration-700"
              style={{ left: `calc(${meterPosition}% - 10px)` }}
            >
              <div className="absolute inset-1 bg-gradient-to-br from-christmas-gold to-amber-600 rounded-full" />
            </div>
          </div>

          {/* Verdict info */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-christmas-gold/20 to-amber-600/20 border border-christmas-gold/30">
              <span className="text-christmas-snow/70">Verdict:</span>
              <span className="font-display text-christmas-gold font-bold">{verdict.badge}</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-christmas-snow/50 text-xs">Score</p>
                <p className={`font-display text-2xl font-bold ${verdict.isNice ? 'text-christmas-green' : 'text-christmas-red'}`}>
                  {verdict.score}%
                </p>
              </div>
              <div className="w-px h-10 bg-christmas-gold/20" />
              <div className="text-center">
                <p className="text-christmas-snow/50 text-xs">Aura</p>
                <p className="font-display text-lg text-christmas-gold">{verdict.aura}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hint text */}
        <p className="text-center text-christmas-snow/50 text-sm">
          Your actions shape how your Bloomer blooms ✨
        </p>
      </div>
    </section>
  );
};

export default BloomersVerdict;
