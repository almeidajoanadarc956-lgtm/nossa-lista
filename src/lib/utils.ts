import { Categoria } from '@/types';

export const CATEGORIAS = {
  supermercado: {
    label: 'Supermercado',
    cor: 'emerald',
    bgClass: 'bg-emerald-50 border-emerald-200',
    textClass: 'text-emerald-700',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    emoji: '🛒',
  },
  deposito: {
    label: 'Depósito',
    cor: 'amber',
    bgClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-700',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    emoji: '🏗️',
  },
  outros: {
    label: 'Outros',
    cor: 'violet',
    bgClass: 'bg-violet-50 border-violet-200',
    textClass: 'text-violet-700',
    badgeClass: 'bg-violet-100 text-violet-700 border-violet-200',
    emoji: '📦',
  },
} as const;

export function getCategoriaInfo(categoria: Categoria) {
  return CATEGORIAS[categoria];
}

export function formatarData(dataISO: string): string {
  const data = new Date(dataISO);
  const agora = new Date();
  const diff = agora.getTime() - data.getTime();
  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);

  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos}min`;
  if (horas < 24) return `há ${horas}h`;
  if (dias < 7) return `há ${dias}d`;
  return data.toLocaleDateString('pt-BR');
}

export function gerarCodigoConvite(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}
