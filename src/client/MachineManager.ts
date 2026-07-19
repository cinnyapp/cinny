import { ObjectReader } from 'neurone/lib/utils';
import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import { ClientContext } from './context';

export class MachineManager implements Disposable {
  private readonly ct: ClientContext;

  private readonly disposer = new Disposer();

  constructor(ct: ClientContext) {
    this.ct = ct;

    this.manageRoomEncryptionSettings();
  }

  private manageRoomEncryptionSettings(): void {
    const handleEncryptionContent = (roomId: string, content: object) => {
      const algorithm = ObjectReader.string(content, 'algorithm');
      if (algorithm !== 'm.megolm.v1.aes-sha2') return;

      const sessionRotationPeriodMs = ObjectReader.number(content, 'rotation_period_ms');
      const sessionRotationPeriodMessages = ObjectReader.number(content, 'rotation_period_msgs');

      this.ct.machine.roomEncryption.setSettings(roomId, {
        algorithm,
        encryptStateEvents: false,
        onlyAllowTrustedDevices: false,
        sessionRotationPeriodMs,
        sessionRotationPeriodMessages,
      });
    };

    this.disposer.collect(
      this.ct.state.join.encryption.subscribe((events) =>
        events.forEach((obj) => {
          handleEncryptionContent(obj.roomId, obj.event.content);
        })
      )
    );
  }

  dispose(): void {
    this.disposer.run();
  }
}
