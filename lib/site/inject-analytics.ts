const ANALYTICS_SCRIPT = `<script>
  const slug = window.location.pathname.split('/')[2];

  function track(event_type) {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_slug: slug, event_type })
    });
  }

  track('page_view');

  document.addEventListener('submit', function() {
    track('form_submit');
  });
</script>`;

export function injectAnalyticsScript(html: string): string {
  const closingBodyIndex = html.toLowerCase().lastIndexOf("</body>");

  if (closingBodyIndex === -1) {
    return `${html}\n${ANALYTICS_SCRIPT}`;
  }

  return `${html.slice(0, closingBodyIndex)}${ANALYTICS_SCRIPT}\n${html.slice(closingBodyIndex)}`;
}
