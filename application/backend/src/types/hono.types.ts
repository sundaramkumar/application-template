export interface JwtPayload {
  sub:      string;        // user id (UUID); '' for an API key with no creator
  username: string;
  name:     string;        // full_name
  role:     string | null; // role name
  iat?:     number;
  exp?:     number;
}

export interface HonoVariables {
  user: JwtPayload;
}
