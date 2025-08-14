export function ComingSoonCard({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-6 text-center">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-brand-ink/70 text-sm">
        🚧 개발중입니다.<br />
        곧 업데이트 예정입니다.
      </p>
    </div>
  );
}