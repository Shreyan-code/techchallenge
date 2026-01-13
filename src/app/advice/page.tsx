import { AdviceClient } from './advice-client';

export default function AdvicePage() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold font-headline mb-2">Instant AI Advice</h1>
      <p className="text-muted-foreground mb-6">
        Ask our AI assistant for pet care tips, training advice, and more.
      </p>
      <AdviceClient />
    </div>
  );
}
