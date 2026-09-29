import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Text } from '@/components/Themed';

/**
 * Diálogos de la app (reemplazo de Alert.alert).
 * Alert.alert no hace nada en la web, así que los errores quedaban en silencio.
 * showDialog funciona igual en iOS, Android y web, con el estilo de la marca.
 */
export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface DialogState {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

type Listener = (d: DialogState | null) => void;
const listeners = new Set<Listener>();
const queue: DialogState[] = [];
let current: DialogState | null = null;

function emit() {
  listeners.forEach((l) => l(current));
}

export function showDialog(title: string, message?: string, buttons?: DialogButton[]) {
  const d: DialogState = { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] };
  if (current) queue.push(d);
  else {
    current = d;
    emit();
  }
}

function close(button?: DialogButton) {
  current = queue.shift() ?? null;
  emit();
  button?.onPress?.();
}

export function DialogHost() {
  const [dialog, setDialog] = useState<DialogState | null>(current);
  useEffect(() => {
    listeners.add(setDialog);
    return () => {
      listeners.delete(setDialog);
    };
  }, []);

  const cancel = dialog?.buttons.find((b) => b.style === 'cancel');
  return (
    <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(cancel)}>
      <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={() => cancel && close(cancel)}>
        <Pressable className="w-full max-w-sm rounded-3xl bg-paper p-6" onPress={() => undefined}>
          <Text className="text-lg font-semibold leading-6 text-ink">{dialog?.title}</Text>
          {dialog?.message ? <Text className="mt-2 text-[15px] leading-[22px] text-muted">{dialog.message}</Text> : null}
          <View className="mt-5">
            {dialog?.buttons.map((b, i) => (
              <Pressable
                key={`${b.text}-${i}`}
                accessibilityRole="button"
                onPress={() => close(b)}
                className={`mt-2 h-12 items-center justify-center rounded-full ${
                  b.style === 'cancel'
                    ? 'bg-transparent'
                    : b.style === 'destructive'
                      ? 'border border-accent bg-accent-soft'
                      : i === 0
                        ? 'bg-primary'
                        : 'border border-line bg-paper'
                } active:opacity-80`}
              >
                <Text
                  className={`text-base font-semibold ${
                    b.style === 'cancel' ? 'text-muted' : b.style === 'destructive' ? 'text-ink' : i === 0 ? 'text-paper' : 'text-ink'
                  }`}
                >
                  {b.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
