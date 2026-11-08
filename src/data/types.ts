// Tipos de filas locales (SQLite). Booleanos 0/1, arrays como JSON en TEXT.

export type Zone = {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  radius_m: number;
  emergency_active: number;
  emergency_type: string | null;
  emergency_started_at: string | null;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  phone_whatsapp: string | null;
  zone_id: string | null;
  home_lat: number | null;
  home_lng: number | null;
  is_zone_admin: number;
  is_vulnerable: number;
  aynis: number;
  easy_mode: number;
  first_name?: string | null;
  last_name?: string | null;
  demo_mode?: number | null;
  public_home_lat?: number | null;
  public_home_lng?: number | null;
  created_at: string;
  updated_at: string;
};

export type ReviewStatus = 'pendiente' | 'aprobado' | 'rechazado';

export type ListingKind = 'servicio' | 'producto';

export type Listing = {
  id: string;
  owner_id: string | null;
  zone_id: string | null;
  kind: ListingKind;
  category: string;
  title: string;
  description: string | null;
  price_hint: string | null;
  schedule: string | null;
  lat: number;
  lng: number;
  whatsapp: string | null;
  available_in_emergency: number;
  emergency_capability: string | null;
  visto_bueno_count: number;
  is_active: number;
  review_status?: ReviewStatus | null;
  review_note?: string | null;
  public_lat?: number | null;
  public_lng?: number | null;
  created_at: string;
  updated_at: string;
};

export type VistoBueno = {
  id: string;
  listing_id: string;
  voter_id: string;
  comment: string | null;
  distance_m: number;
  created_at: string;
};

export type FavorType = 'pido' | 'ofrezco' | 'presto' | 'dono' | 'intercambio' | 'movilidad';
export type FavorStatus = 'abierto' | 'en_curso' | 'resuelto';
export type MobilityRole = 'llevo' | 'recojo' | 'busco';

export type Favor = {
  id: string;
  author_id: string | null;
  zone_id: string | null;
  type: FavorType;
  category: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  status: FavorStatus;
  accepted_response_id: string | null;
  mobility_destination: string | null;
  mobility_days: string | null; // JSON string[]
  mobility_time: string | null;
  mobility_role: MobilityRole | null;
  review_status?: ReviewStatus | null;
  review_note?: string | null;
  public_lat?: number | null;
  public_lng?: number | null;
  created_at: string;
  updated_at: string;
};

export type ResponseStatus = 'propuesto' | 'aceptado' | 'agradecido' | 'completado' | 'retirado';

export type FavorResponse = {
  id: string;
  favor_id: string;
  responder_id: string;
  responder_name: string | null;
  message: string | null;
  lat: number;
  lng: number;
  location_source: 'gps' | 'mapa';
  location_label: string | null;
  distance_m: number;
  status: ResponseStatus;
  thanks_message: string | null;
  public_lat?: number | null;
  public_lng?: number | null;
  created_at: string;
  updated_at: string;
};

export type ReportKind = 'sos' | 'estoy_bien' | 'vulnerable' | 'recurso_necesito' | 'recurso_ofrezco';
export type ReportStatus = 'abierto' | 'atendiendo' | 'resuelto';

export type EmergencyReport = {
  id: string;
  author_id: string | null;
  author_name: string | null;
  zone_id: string | null;
  kind: ReportKind;
  need: string | null;
  description: string | null;
  people_count: number | null;
  priority: number;
  lat: number;
  lng: number;
  status: ReportStatus;
  origin: 'online' | 'mesh' | 'sms';
  mesh_hops: number | null;
  review_status?: ReviewStatus | null;
  review_note?: string | null;
  public_lat?: number | null;
  public_lng?: number | null;
  created_at: string;
  updated_at: string;
};
