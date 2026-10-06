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
      <Pressable className="flex-1 items-center justify-center bg-black/30 px-5" onPress={() => cancel && close(cancel)}>
        <Pressable className="w-full rounded-2xl border border-line bg-paper p-5" style={{ maxWidth: 380 }} onPress={() => undefined}>
          <Text className="font-semibold text-[17px] leading-[23px] tracking-tight text-ink">{dialog?.title}</Text>
          {dialog?.message ? <Text className="mt-1.5 text-[14px] leading-[20px] text-muted">{dialog.message}</Text> : null}
          <View className="mt-4">
            {dialog?.buttons.map((b, i) => (
              <Pressable
                key={`${b.text}-${i}`}
                accessibilityRole="button"
                onPress={() => close(b)}
                className={`mt-2 h-11 items-center justify-center rounded-full ${
                  b.style === 'cancel' ? 'bg-transparent' : b.style === 'destructive' ? 'bg-[#B4233C]' : i === 0 ? 'bg-ink' : 'border border-line bg-paper'
                } active:opacity-80`}
              >
                <Text
                  className={`font-semibold text-[15px] ${
                    b.style === 'cancel' ? 'text-muted' : b.style === 'destructive' || i === 0 ? 'text-paper' : 'text-ink'
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
