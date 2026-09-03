export default function SynthesizedAnswer({ answer }: { answer: string }) {
  return (
    <div className="answer-block">
      <p className="answer-label">Summary from the catalog</p>
      <p>{answer}</p>
    </div>
  );
}
