<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [sip.js](./sip.js.md) &gt; [Subscriber](./sip.js.subscriber.md)

## Subscriber class

A subscriber establishes a [Subscription](./sip.js.subscription.md) (outgoing SUBSCRIBE).

<b>Signature:</b>

```typescript
export declare class Subscriber extends Subscription 
```

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(userAgent, targetURI, eventType, options)](./sip.js.subscriber._constructor_.md) |  | Constructor. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [subscribe(options)](./sip.js.subscriber.subscribe.md) |  | Subscribe to event notifications. |
|  [unsubscribe(options)](./sip.js.subscriber.unsubscribe.md) |  | Unsubscribe from event notifications. |

## Remarks

This is (more or less) an implementation of a "subscriber" as defined in RFC 6665 "SIP-Specific Event Notifications". https://tools.ietf.org/html/rfc6665

## Example


```ts
// Create a new subscriber.
const targetURI = new URI("sip", "alice", "example.com");
const eventType = "example-name"; // https://www.iana.org/assignments/sip-events/sip-events.xhtml
const subscriber = new Subscriber(userAgent, targetURI, eventType);

// Add delegate to handle event notifications.
subscriber.delegate = {
  onNotify: (notification: Notification) => {
    // handle notification here
  }
};

// Monitor subscription state changes.
subscriber.stateChange.on((newState: SubscriptionState) => {
  if (newState === SubscriptionState.Terminated) {
    // handle state change here
  }
});

// Attempt to establish the subscription
subscriber.subscribe();

// Sometime later when done with subscription
subscriber.unsubscribe();

```

