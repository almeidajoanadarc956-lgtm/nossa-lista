export type Categoria = 'supermercado' | 'deposito' | 'outros';

export interface Produto {
  id: string;
  lista_id: string;
  nome: string;
  categoria: Categoria;
  comprado: boolean;
  criado_por: string;
  criado_por_nome: string;
  criado_em: string;
  atualizado_em: string;
}

export interface Lista {
  id: string;
  nome: string;
  codigo_convite: string;
  criado_por: string;
  criado_em: string;
}

export interface Participante {
  id: string;
  lista_id: string;
  user_id: string;
  nome: string;
  email: string;
  entrou_em: string;
}

export interface PerfilUsuario {
  id: string;
  nome: string;
  email: string;
  lista_id: string | null;
  criado_em: string;
}

export type FiltroCategoria = 'todos' | Categoria;

export interface EstadoConexao {
  online: boolean;
  sincronizando: boolean;
}
