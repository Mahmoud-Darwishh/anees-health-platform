'use client';

import { useActionState } from 'react';
import { Button, Input, Select, Textarea, Toast } from '@/components/ui';
import {
  idlePushBroadcastState,
  sendPushBroadcastAction,
  type PushBroadcastActionState,
} from './actions';
import styles from './notifications.module.scss';

function toastTone(status: PushBroadcastActionState['status']) {
  if (status === 'success') return 'success';
  if (status === 'warning') return 'warning';
  if (status === 'error') return 'danger';
  return 'info';
}

export function PushNotificationForm() {
  const [state, formAction, isPending] = useActionState(sendPushBroadcastAction, idlePushBroadcastState);
  const fields = state.fields ?? idlePushBroadcastState.fields;
  const showResult = state.status !== 'idle' && Boolean(state.message);

  return (
    <form action={formAction} className={styles.composer} noValidate>
      {showResult ? (
        <Toast
          experience="ops"
          tone={toastTone(state.status)}
          title={state.status === 'success' ? 'Notification sent' : 'Notification not sent'}
          description={state.message}
        />
      ) : null}

      <div className={styles.formGrid}>
        <Input
          id="title"
          name="title"
          label="Title"
          defaultValue={fields?.title}
          maxLength={80}
          required
          experience="ops"
          hint="Keep this short. It appears on lock screens."
        />

        <Select
          id="locale"
          name="locale"
          label="Audience"
          defaultValue={fields?.locale ?? 'all'}
          experience="ops"
          hint="Use locale targeting when the message language is specific."
        >
          <option value="all">All subscribed devices</option>
          <option value="en">English subscribers</option>
          <option value="ar">Arabic subscribers</option>
        </Select>
      </div>

      <Textarea
        id="body"
        name="body"
        label="Message"
        defaultValue={fields?.body}
        maxLength={180}
        required
        experience="ops"
        hint="Do not include diagnoses, payment details, addresses, or private clinical information."
        placeholder="Your visit has been updated. Open Anees Health for details."
      />

      <Input
        id="url"
        name="url"
        label="Open path"
        defaultValue={fields?.url}
        dir="ltr"
        experience="ops"
        hint="Internal paths only, for example /en/portal or /ar/booking."
      />

      <div className={styles.actions}>
        <Button type="submit" experience="ops" loading={isPending}>
          {isPending ? 'Sending...' : 'Send app notification'}
        </Button>
      </div>
    </form>
  );
}
