update public.collections
set tint = 'bg-white'
where tint is distinct from 'bg-white';

alter table public.collections
  alter column tint set default 'bg-white';
