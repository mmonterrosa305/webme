export default function PreviewNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-50 px-4 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">
        Preview not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-neutral-600">
        This link may have expired or the site hasn&apos;t been built yet.
        Contact us if you believe this is an error.
      </p>
    </div>
  );
}
