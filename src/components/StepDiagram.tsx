import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/constants/theme';

/**
 * Diagrama del flujo de creación: 1 ── 2 ── 3 ── 4
 * Muestra con claridad dónde estás y cuánto falta, sin agobiar.
 */
export function StepDiagram({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View className="flex-row items-start px-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={label}>
            <View className="w-16 items-center">
              <View
                className={`h-8 w-8 items-center justify-center rounded-full border ${
                  done ? 'border-ink bg-ink' : active ? 'border-rose-deep bg-rose-soft' : 'border-line bg-paper'
                }`}
              >
                {done ? (
                  <Ionicons name="checkmark" size={16} color={colors.cream} />
                ) : (
                  <Text className={`text-sm ${active ? 'text-rose-deep' : 'text-muted'}`}>{i + 1}</Text>
                )}
              </View>
              <Text numberOfLines={1} className={`mt-1 text-[11px] ${active ? 'font-semibold text-ink' : 'text-muted'}`}>
                {label}
              </Text>
            </View>
            {i < steps.length - 1 ? <View className={`mt-4 h-px flex-1 ${i < current ? 'bg-ink' : 'bg-line'}`} /> : null}
          </Fragment>
        );
      })}
    </View>
  );
}
