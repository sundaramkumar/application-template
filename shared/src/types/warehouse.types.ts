export interface Warehouse {
  company_id:    number;
  company_name:  string;
  store_name:    string;
  store_prefix:  string | null;
  whscode:       string;
  address:       string | null;
  city:          string | null;
  state:         string | null;
  country:       string | null;
  phoneno:       string | null;
  mobileno:      string | null;
  email:         string | null;
  tinno:         string | null;
  cstno:         string | null;
  fssai_no:      string | null;
  mac_address:   string | null;
  mac_address_2: string | null;
  mac_address_3: string | null;
  mac_address_4: string | null;
  bill_token:    string | null;
  store_order:   number | null;
  is_test_store: string | null;
}

export interface WarehouseListRequest {
  page?:   number;
  limit?:  number;
  sort?:   string;
  order?:  'asc' | 'desc';
  search?: string;
}

export interface WarehouseListResponse {
  data:  Warehouse[];
  total: number;
}

export interface WarehouseUpdateRequest {
  address?:       string;
  city?:          string;
  phoneno?:       string;
  tinno?:         string;
  fssai_no?:      string;
  mac_address?:   string;
  mac_address_2?: string;
  mac_address_3?: string;
  mac_address_4?: string;
  store_order?:   number;
}

export interface WarehouseSyncResponse {
  [key: string]: unknown;
}

export interface WarehouseCitiesResponse {
  data: string[];
}
