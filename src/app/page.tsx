import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar se o usuário tem uma lista
  const { data: perfil } = await supabase
    .from('perfis')
    .select('lista_id')
    .eq('id', user.id)
    .single();

  if (!perfil?.lista_id) {
    redirect('/lista/configurar');
  }

  redirect('/lista');
}
