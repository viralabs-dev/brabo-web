---
category: Dominio
keywords: [notificações, sino, pendências, agrupado, topbar]
---

# NotificationBell

The topbar bell. It groups unread events **by project** and opens a panel with
the event rows (each one is an `EventItem`).

## How to use

```tsx
<NotificationBell
  groups={[{ projectId: 'p1', projectName: 'plataforma-de-pagamentos', events }]}
  unreadCount={3}
  onMarkRead={marcarTodasLidas}
/>
```

## What to respect

- **The panel is internal state**, with no prop to open it. Mounting the
  component shows only the bell: in a preview or test that needs the panel, click
  the `aria-label="Notificações"` button.
- `unreadCount` is independent of `groups`: it comes from the server counter and
  decides whether the badge shows (above 99 it becomes "99+").
- `onMarkRead` marks **everything** as read, not one group. This component has no
  per-project marking.
