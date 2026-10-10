import React from 'react';
import axios from 'axios';
import { Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { create } from 'zustand';
import Select from 'react-select';
import { debounce } from 'lodash-es';

const schema = z.object({ label: z.string().min(1) });
const useAddonStore = create<{ label: string }>(() => ({
  label: 'smoke-extension-hook',
}));
const onChange = debounce(() => undefined, 100);

export default function AddonDependencies() {
  const label = useAddonStore((state) => state.label);
  const { register } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  return (
    <span data-client={axios.VERSION}>
      <Settings size={16} />
      {label}
      <input {...register('label')} aria-label='Addon label' />
      <Select options={[{ value: label, label }]} onChange={onChange} />
    </span>
  );
}
