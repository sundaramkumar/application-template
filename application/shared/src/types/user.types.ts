export type UserStatus = 'active' | 'inactive';

export interface User {
  id:         string;
  username:   string;
  full_name:  string;
  email:      string;
  status:     UserStatus;
  role_id:    string | null;
  role_name:  string | null;
  created_at:      string | null;
  updated_at:      string | null;
  created_by:      string | null;
  created_by_name: string | null;   // null = system / seed
  updated_by:      string | null;
  updated_by_name: string | null;
}

export interface UserListResponse {
  data:  User[];
  total: number;
}

export interface UserCreateRequest {
  username:  string;
  password:  string;
  full_name: string;
  email:     string;
  status?:   UserStatus;
  role_id?:  string | null;
}

export interface UserUpdateRequest {
  username?:  string;
  password?:  string;  // when present, re-hashed
  full_name?: string;
  email?:     string;
  status?:    UserStatus;
  role_id?:   string | null;
}
