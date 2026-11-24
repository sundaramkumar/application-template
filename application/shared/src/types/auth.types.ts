export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthUser {
  id:        string;
  username:  string;
  full_name: string;
  email:     string;
  status:    'active' | 'inactive';
  role_id:   string | null;
  role_name: string | null;
}

export interface AuthLoginResponse {
  user: AuthUser;
}
