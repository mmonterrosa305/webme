type SiteContentFrameProps = {
  html: string;
  title: string;
  className?: string;
};

export function SiteContentFrame({
  html,
  title,
  className = "min-h-screen w-full",
}: SiteContentFrameProps) {
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      className={`border-0 bg-white ${className}`}
    />
  );
}
