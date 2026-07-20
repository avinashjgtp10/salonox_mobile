# SalonOX Realtime Socket Contract

The mobile app connects to `EXPO_PUBLIC_SOCKET_URL` when set, otherwise it derives the socket origin from `API_BASE_URL`.

## Authentication

The client sends the access token in the Socket.IO auth payload:

```ts
io(socketUrl, {
  auth: { token: accessToken },
});
```

The backend should validate the token during the Socket.IO handshake and reject unauthenticated sockets.

## Salon Room

After connect and whenever the active branch changes, the client emits:

```ts
socket.emit("salon:join", { salonId, room: `salon:${salonId}` });
```

When switching branch rooms, the client also emits:

```ts
socket.emit("salon:leave", { salonId, room: `salon:${salonId}` });
```

The backend should add the socket only to `salon:${salonId}` rooms the authenticated user is allowed to access.

## Entity Events

Emit these events only to the affected salon room:

```ts
io.to(`salon:${salonId}`).emit("appointments:created", payload);
io.to(`salon:${salonId}`).emit("appointments:updated", payload);
io.to(`salon:${salonId}`).emit("appointments:deleted", payload);
```

Use the same pattern for:

- `clients`
- `staff`
- `attendance`
- `products`
- `services`
- `sales`
- `memberships`
- `notifications`

The mobile app also accepts singular aliases such as `appointment.updated` and a generic:

```ts
io.to(`salon:${salonId}`).emit("entity:changed", {
  action: "updated",
  entity: "appointments",
  id: appointmentId,
  salonId,
});
```

## Payload

Payload shape can be minimal because the mobile app refreshes the affected Redux slice from the API:

```ts
{
  action: "created" | "updated" | "deleted",
  entity: "appointments",
  id: "entity-id",
  salonId: "salon-id",
  updatedAt: new Date().toISOString()
}
```
