import { howItWorksSteps } from '../../data/landingData';

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="w-full bg-landing-bg py-14 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-landing-text text-xl md:text-2xl font-medium mb-12 md:mb-16">
          Comment ça marche
        </h2>

        <div className="border border-landing-border rounded-lg p-6 md:p-8">
          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            {howItWorksSteps.map((step, index) => (
              <div
                key={step.number}
                className={`flex flex-col ${
                  index < howItWorksSteps.length - 1
                    ? 'md:border-r border-landing-border md:pr-8'
                    : ''
                }`}
              >
                <div className="flex items-baseline gap-2 mb-3">
                  <span
                    className="text-4xl md:text-5xl font-bold text-landing-gold tabular-nums"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {step.number}
                  </span>
                  <h3 className="text-landing-text text-lg font-semibold">{step.title}</h3>
                </div>
                <p className="text-landing-text-muted text-sm mb-4">{step.subtitle}</p>
                <div className="mt-auto">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden border border-landing-border/50 bg-landing-card">
                    <img
                      src={step.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
