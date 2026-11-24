import { BookOpen, ExternalLink, FileJson } from 'lucide-react';
import { BRAND } from '@/shared/config/brand.config';
import { Button } from '@/shared/components/ui';
import { BASE_URL } from '@/shared/api/client';

/* The OpenAPI reference (Scalar) is served by the backend at /api/docs and is
   gated by the same session auth. We open it in a new tab so the backend-origin
   session cookie is sent on a top-level navigation. */
export default function ApiDocs() {
  const docsUrl = `${BASE_URL}/api/docs`;
  const specUrl = `${BASE_URL}/api/openapi.json`;

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-2xl mx-auto mt-6 rounded-2xl border p-8" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--accent-50, #eff6ff)', color: 'var(--accent-600, #2563eb)' }}>
            <BookOpen size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-1)' }}>API Documentation</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>Interactive OpenAPI reference for the {BRAND.name} REST API.</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-2)' }}>
          Authenticate programmatic calls with an <strong>API key</strong> (created under{' '}
          <em>System → API Keys</em>) sent as <code className="font-mono text-xs">Authorization: Bearer app_…</code>{' '}
          or <code className="font-mono text-xs">X-API-Key: app_…</code>. A key inherits the permissions and
          data scope of the role it is bound to.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button leftIcon={<ExternalLink size={15} />} onClick={() => window.open(docsUrl, '_blank', 'noopener')}>
            Open API Reference
          </Button>
          <Button variant="secondary" leftIcon={<FileJson size={15} />} onClick={() => window.open(specUrl, '_blank', 'noopener')}>
            View OpenAPI Spec
          </Button>
        </div>
      </div>
    </div>
  );
}
