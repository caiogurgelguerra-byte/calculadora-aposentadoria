export type ClientStatus =
  | 'lead'
  | 'rejeitado'
  | 'liberado'
  | 'em_onboarding'
  | 'submetido'
  | 'em_consultoria'
  | 'concluido';

export type EstadoCivil = 'solteiro' | 'casado' | 'uniao_estavel' | 'divorciado' | 'viuvo';

export type RegimeTrabalho =
  | 'clt'
  | 'pj'
  | 'autonomo'
  | 'servidor_publico'
  | 'empresario'
  | 'aposentado'
  | 'outro';

export interface Profile {
  id: string;
  nome_completo: string;
  data_nascimento: string;
  estado_civil: EstadoCivil;
  dependentes: number[];
  profissao: string;
  regime_trabalho: RegimeTrabalho;
  cidade: string;
  uf: string;
  telefone: string;
  status: ClientStatus;
  is_admin: boolean;
  motivo_rejeicao: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithEmail extends Profile {
  email: string | null;
  last_sign_in_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
    };
    Views: {
      profiles_with_email: { Row: ProfileWithEmail };
    };
    Enums: {
      client_status: ClientStatus;
      estado_civil: EstadoCivil;
      regime_trabalho: RegimeTrabalho;
    };
  };
}
