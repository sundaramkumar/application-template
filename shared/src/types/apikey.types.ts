export interface ApiKey {
  id:           string;
  name:         string;
  prefix:       string;            // first chars of the key, for display
  role_id:      string;
  role_name:    string | null;     // resolved at read time
  active:       boolean;
  expires_at:   string | null;
  last_used_at: string | null;
  created_at:   string | null;
  revoked_at:   string | null;
}

/** Returned only from create — includes the full plaintext key, shown once. */
export interface ApiKeyCreateResponse extends ApiKey {
  key: string;
}
